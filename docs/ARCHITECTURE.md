# Architecture

Training Academy is a static single-page app. There is no server, no account, no database in the cloud and no
runtime secret. Everything a child does is decided by a small headless engine, saved in the browser, and drawn by a
thin React layer. Phase 01 built that foundation; this document describes what exists and why each choice was made.

## The layers

```
src/
  engine/    Pure TypeScript. Schemas, seeded randomness, lesson progression, evidence. No clock, no random source,
             no DOM, no React, no three.js. Depends on nothing but itself (and the schema validator).
  content/   Authored curriculum: one versioned JSON pack per world, loaded on entering that world and validated
             before use. lint.ts holds the correctness checks that run in the unit tests.
  storage/   Local-first persistence: IndexedDB → localStorage → memory, behind one driver interface. Migrations,
             the typed repository, export/import. Depends on the engine only.
  game/      Browser-side glue around the engine: the shared services (clock, ids, the one repository), the players
             store, the lesson runner, the world registry, per-world modules, and the world and lesson screens.
  render/    How the hub is drawn: the illustrated island (SVG), the WebGL probe, quality tiers, and hub3d/, the only
             folder allowed to import three.js.
  ui/        Controls (buttons, toggle, hold button, modal), icons and hand-drawn vector art.
  audio/     The audio engine: unlock on first touch, mute, a handful of synthesised cues.
  parent/    The grown-ups area.
  app/       The shell: entry wiring, history router, settings, error boundary, diagnostics, lazy-chunk loader,
             service-worker registration.
  styles/    Design tokens, base styles, bundled fonts.
tests/       Vitest: engine, content, storage, game, app, parent, config.
e2e/         Playwright specs, run against the production build.
scripts/     Build plugins (Vercel parity, service worker) and tools (dist verifier, screenshots, icons, measurements).
public/      Files served under their own names: manifest, favicon, robots.txt, assets/icons.
docs/        This file and the other living documents.
```

### Rules of the seams (enforced by ESLint, not just written here)

| Rule                                                                                                                                                                       | Why                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/engine` may not use `Math.random`, `Date.now`, `new Date()`, `window`, `document`, storage, timers or `fetch`, and may not import React, three.js or any other layer. | The same seed and the same answers must always give the same lesson and the same record: in a test, after a refresh, on another device. |
| `src/content` and `src/storage` may import the engine and nothing UI.                                                                                                      | They must be usable headless (tests, future tools, import checks).                                                                      |
| `three` and `@react-three/*` may be imported only under `src/render/hub3d`.                                                                                                | So an innocent import can never pull 750 kB of 3D code into the first load.                                                             |
| Correctness is decided only in `engine/session.ts`.                                                                                                                        | "No rendering-driven scoring": a component reports what was tapped and draws what comes back.                                           |

`scripts/verify-dist.mjs` checks the third rule again on the built files, by following the entry chunk's static imports.
That check caught a real defect during this phase (see _Bundle splitting_).

## The learning engine

Public surface: `src/engine/index.ts`.

| Function                                                                                | What it does                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createSession(lesson, { id, profileId, seed, now, contentVersion })`                   | Plans one sitting: demonstrations, then guided steps, then `count` independent probes drawn from the lesson's pool by the seed. The undrawn pool is kept as a reserve.                          |
| `getNextChallenge(session, lesson)`                                                     | A pure read: what to show now (challenge, choices in a stable seeded order, which are still available, hints left), or `null` when finished.                                                    |
| `advanceDemo(session, lesson, now)`                                                     | Moves past a demonstration. Nothing is asked and nothing is recorded.                                                                                                                           |
| `submitAttempt(session, lesson, { key, choiceId, now, day, durationMs, adultAssist? })` | Decides correctness; returns the next session and the `Attempt` to store, or a rejection (`stale`, `completed`, `not-answerable`, `unknown-choice`, `unavailable-choice`) that changes nothing. |
| `getHint(session, lesson, now)`                                                         | Shows the next rung of the challenge's authored hint ladder (`model` → `eliminate` → `reveal`). From then on, the answer to that challenge is recorded as assisted.                             |
| `getSkillEvidence(attempts, skillId, policy?)`                                          | Derives what the record says about one skill.                                                                                                                                                   |
| `summarizeSession(session, lesson)`                                                     | Tallies for the end-of-lesson line shown to a grown-up.                                                                                                                                         |

Things worth knowing:

- **A wrong answer is never a dead end.** The choice just tried is taken away and the child tries again. When only the
  right choice is left it is revealed; tapping it completes the challenge as an assisted solve.
- **Double taps are harmless.** Each presentation has a key (`session/step/try`); a second submission with the same key
  is rejected as `stale`.
- **Re-probing.** An independent challenge that needed help is followed, at the end of the lesson, by a _different_
  challenge for the same skill (preferring a different presentation), up to the lesson's `maxReprobes`. A struggling
  child is therefore not kept in a loop.
- **Evidence is derived, never stored.** The record is the append-only list of attempts. Opening a lesson, watching a
  demonstration or reading a hint writes no attempt, so none of them can add up to "mastery".
- **What counts as independent:** a first try (`tryIndex` 0), with no hint (`hintLevel` 0), no adult help, in an
  independent step. The same challenge answered again on the same day counts once, so replaying a lesson cannot
  inflate the count; reaching `consistently-independent` needs successes on at least two calendar days and two
  presentations.
- **Statuses** are `not-yet-observed`, `exploring`, `guided`, `practicing`, `provisionally-independent`,
  `consistently-independent` — the names Phase 12 uses. The thresholds live in `DEFAULT_EVIDENCE_POLICY` and are
  product heuristics, not validated diagnostic cut-offs.

### Data shapes

All shapes are [valibot](https://valibot.dev) schemas in `src/engine/schema.ts`; the TypeScript types are inferred from
them, so the compiler and the validator cannot disagree. Valibot was chosen over heavier validators because only the
functions actually used are bundled.

| Shape                                          | Notes                                                                                                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ContentPack` → `Skill`, `Lesson`, `Challenge` | Strict objects: an unknown field (a typo) fails validation. `schemaVersion` for the file format, `contentVersion` per pack, `version` per lesson.                                                                         |
| `Profile`                                      | A nickname and a picture. No real name is asked for, no birth date, nothing else.                                                                                                                                         |
| `LessonSession`                                | One sitting: seed, planned steps, cursor, the current presentation's tries/hints/eliminated choices, tallies.                                                                                                             |
| `Attempt`                                      | One response: skill, challenge, variant, stage, try index, hint level, assistance, outcome, the choice, a misconception tag, time, local day, bounded duration, content versions. No free text, no coordinates, no audio. |

IDs: skills are dotted (`math.quantity.match-sets-to-3`); lessons are URL-safe slugs (`ng-same-amount-01`) because they
appear in addresses; challenges are `lesson-id.local-name`.

## Content

`src/content/packs/<world>.v<contentVersion>.json`, loaded by `loadPack(world)` with a dynamic import, so each pack is
its own chunk. A pack that fails the schema is refused, never half-used.

`src/content/lint.ts` checks what a schema cannot: references, the prerequisite graph (missing, self, cycles), plan
consistency, hint ladders that never remove the answer and always end by revealing it, and — for quantity challenges —
that the marked answer is the one and only choice with the right amount, that no two choices show the same amount,
that the right choice is not simply the same picture as the prompt, and that each distractor's misconception tag
matches what it shows. It runs in `tests/content`; it is not shipped to the browser.

See `docs/CURRICULUM.md` for the authoring conventions.

## Storage

```
openRepository()            never rejects: a browser that allows no storage still gets a playable game
  openDriver()              IndexedDB  →  localStorage  →  memory          (notes record why a fallback was taken)
  migrate()                 brings data up to DATA_VERSION, one atomic step per version
  Repository                typed, validating API used by the game
```

- **Driver interface** (`storage/driver.ts`): four stores (`meta`, `profiles`, `sessions`, `attempts`), `get`, `list`
  (optionally by profile), `write(ops)` as an all-or-nothing batch, `clear`. The same contract tests run against all
  three drivers.
- **Atomicity.** IndexedDB: one transaction per batch, requests issued without awaiting in between. localStorage: the
  whole database is one JSON document written with a single `setItem`. A lesson step and the attempt that caused it
  are saved in one batch.
- **Attempts are insert-only.** Writing an attempt whose id exists fails the batch with `conflict`; the lesson runner
  then follows the saved sitting (another tab got there first). Nothing is silently overwritten.
- **Validation both ways.** Nothing invalid is written. On the way out, a record that fails validation is skipped,
  counted, and left in place — it never crashes a child's game and is never deleted behind a grown-up's back.
- **Migrations** (`storage/migrations.ts`): `DATA_VERSION` is 1 and the list is empty, but the machinery is tested with
  synthetic multi-step upgrades, including one interrupted half-way. Data written by a _newer_ version of the game is
  left untouched and the game runs from memory.
- **Export/import** (`storage/transfer.ts`): one player per file — readable JSON with a format version and a checksum.
  Import checks type, size, shape, checksum and ownership before writing anything, then merges: attempts are unioned by
  id, the more recently updated copy of the player and of each sitting wins. Importing the same file twice changes
  nothing. The checksum catches accidental damage and casual edits; it is not a signature.
- **Device settings** (sound, motion, graphics) are separate, in localStorage (`app/settings.ts`), because they must be
  known before the first frame is drawn.

Known limits: Safari may evict script-written storage for sites that go unused for a week (ITP) unless the app is
installed to the home screen; `navigator.storage.persist()` is not yet requested. The export file is the backup.
Two tabs are safe but not live-synchronised.

## The shell

- **Routing** (`app/router.ts`, `app/navigation.tsx`): a ~100-line History-API router, no library. Routes: `/`,
  `/world/:world`, `/world/:world/play/:lessonId`, `/grown-ups`, and a not-found page. Links are real anchors. After a
  navigation the page title is set, focus moves to `<main>`, and a live region announces the page. Addresses never
  contain a dot, so a static host can tell a page from a file.
- **Settings**: sound on/off; motion `system | full | reduced` (the toggle flips whatever is in effect and makes it
  explicit); graphics `auto | low | medium | high | pictures`. Reduced motion sets `data-motion="reduced"` on `<html>`,
  which collapses every CSS animation and transition, and puts the 3D scene in render-on-demand mode.
- **Layout**: every single-column grid has an explicit shrinkable column, button labels wrap inside the button, and
  long words break, so that no text — a long nickname, a translation, text zoomed to 200% — can make a page wider than
  the screen. The browser tests check this against the real screen size with the longest names the forms accept.
- **Error boundary**: one around the routed view (reset when the address changes). A failed lazy download becomes a
  `ChunkLoadError`, shown as "this part could not be loaded" with a reload button. The hub has its own boundary, whose
  fallback is simply the illustration.
- **Diagnostics** (`app/diagnostics.ts`): marks, lazy-chunk load times, paint and layout-shift vitals where the browser
  reports them, long tasks, hub mode/tier/renderer/frame statistics/draw calls, and errors. Kept in the page's memory
  and shown under Grown-ups → Diagnostics. Nothing is transmitted: the CSP's `connect-src 'self'` and a browser-test
  guard that fails on any cross-origin request both hold that line.
- **Audio** (`audio/audioEngine.ts`): the audio context is created on the first touch and resumed on later ones (iOS
  suspends it at will); a cue that cannot play is skipped. Six short synthesised cues, no audio files. Phase 04 adds
  recorded narration on top of the same unlock and mute handling.

## The hub

`render/HubStage.tsx` decides what to draw:

1. The **illustrated island** (`IllustratedHub.tsx`, SVG) is on screen from the first paint.
2. After the shell is idle, the plan is made (`render/quality.ts`): pictures-only setting → illustration; no WebGL 2 →
   illustration; on automatic, a device that could only draw 3D in software, or one that has asked to save data →
   illustration; otherwise 3D at a tier.
3. The **3D island** (`render/hub3d/`, React Three Fiber + Drei + three.js) is fetched as its own chunk group and faded
   in after its second rendered frame.
4. A failed download, a render error or a lost graphics context puts the illustration back.

So the "fallback" is a path every visit exercises, not a rarely-run branch.

The illustration has to be cheap, because it is what the weakest devices are left with. A change to any part of an
SVG repaints all of it, so its ambient movement (clouds, birds, ripples, the boat, the flag) runs in small steps, four
to ten a second, instead of on every frame, and the dock over it is a translucent panel with no backdrop blur. Measured
in software rendering at 1366×768, the idle home screen went from 100% of a CPU core to 10%
(`docs/QUALITY_REPORT.md`).

The 3D scene is built from primitives and vertex colours only — no textures, no downloaded models, no CDN. One height
function (`hub3d/island.ts`) places the terrain, the shoreline in the water shader and every prop. The camera rig
(`CameraRig.tsx`) backs off until the island fits the part of the screen the dock leaves uncovered and shifts the view
so the island sits in the middle of that area; the same numbers serve a portrait phone, a phone on its side, a tablet
and a desktop. All animation reads one clock that stops under reduced motion.

Quality tiers (`TIERS` in `render/quality.ts`): `low` (pixel ratio ≤ 1, no shadows), `medium` (≤ 1.5, 1024 shadow
map), `high` (≤ 2, 2048). On automatic, a device with little memory or two cores gets `low`, a touch device `medium`,
otherwise `high`, and Drei's `PerformanceMonitor` may lower the pixel ratio if frames are slow. A CPU rasteriser
(SwiftShader, llvmpipe) is not given 3D on automatic at all: it draws this scene at 8 to 27 frames a second with more
than three cores busy. An explicit choice of quality is respected as given, on any device.

Two upstream messages are handled deliberately: `shadows="percentage"` avoids a shadow mode three.js has removed, and
`hub3d/threeConsole.ts` filters, by exact text, the one deprecation notice that React Three Fiber 9 triggers by
constructing `THREE.Clock`. Everything else three.js says still reaches the console.

## Worlds and the sample activity

`game/worlds.ts` lists the six worlds with grown-up-readable descriptions and whether anything is playable. A world
that is not built shows a plain "not open yet" page with nothing that looks tappable.

`game/worlds/modules.ts` is the registry of per-world code. Only Number Garden has a module so far (how its pictures
are drawn); it and its content pack are fetched on entering that world.

`game/lessonRunner.ts` runs one sitting: resume or create, answer, hint, next, restart. It updates the screen first and
saves second; a failed save never interrupts a child (the lesson continues in memory and says it is not saved).
`game/lesson/LessonView.tsx` is the lesson frame shared by every future world.

## Bundle splitting

| Chunk                                                | When it loads                             |
| ---------------------------------------------------- | ----------------------------------------- |
| entry + `react` + `engine` + `profiles`              | first load                                |
| `three`, `r3f`, `Hub3D`                              | after the shell, only where 3D is planned |
| `WorldView`, `LessonView`, `GrownUps`                | on first visit to that route              |
| `number-garden` (code), `number-garden.v1` (content) | on entering Number Garden                 |

Rolldown's `codeSplitting` groups are configured with `includeDependenciesRecursively: false`. With the default, the
React Three Fiber group also captured React itself, which made the 3D chunk a static dependency of the entry — the
verifier failed the build, and the setting was added. Sizes and budgets are printed by `npm run verify:dist` and
recorded in `docs/TEST_RESULTS.md`.

An on-demand part is fetched by its own `import()`. Vite would normally add a `<link rel="modulepreload">` for the
part and everything it imports just before that; this is switched off for scripts (`build.modulePreload` in
`vite.config.ts`; stylesheets are still fetched alongside, and the first screen's files are still preloaded from
`index.html`). The reason is a WebKit behaviour found by the browser tests: a preload that fails is kept, and the
next request for the same file is handed the same failure — even after the page is reloaded — so one lost download
could leave "Load the page again" unable to help. The cost is one extra round trip before the 3D libraries start
downloading, on a path that already waits for the shell to be idle.

## Serving: Vercel, and the local preview that mirrors it

`vercel.json`:

- one rewrite, `/((?!immutable/|assets/).*)` → `/index.html`, so page addresses work at any depth while a missing file
  under `/immutable/` or `/assets/` is a 404 rather than the app in disguise;
- `Cache-Control: public, max-age=31536000, immutable` for `/immutable/*` (everything Vite emits is content-hashed and
  goes there; `public/assets` keeps its file names and is revalidated);
- `max-age=0, must-revalidate` for `/sw.js`;
- security headers on everything: a Content-Security-Policy that allows this origin and nothing else (no inline script
  or style, `connect-src 'self'`), `Permissions-Policy` switching off camera, microphone, geolocation and payment,
  `Referrer-Policy: no-referrer`, `X-Content-Type-Options`, `X-Frame-Options`, COOP and CORP.

`scripts/vite/vercel-parity.ts` makes `vite preview` behave the same way: it compiles `vercel.json` with Vercel's own
route compiler (`@vercel/routing-utils`) and interprets the result (headers, filesystem check, rewrites, 404). Anything
in `vercel.json` it does not model is an error, never silently ignored. The browser tests therefore run under the
production policy. This is a faithful model, not Vercel itself: see `docs/DEPLOYMENT.md` for what only a real
deployment can confirm.

## Service worker

Generated at build time (`scripts/vite/service-worker.ts` writes `dist/sw.js` from `scripts/vite/sw-source.js` plus a
one-line build manifest). Registered in production builds only, after the page has loaded.

| Request         | Policy                                                                                                                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages           | Network first, so an online device always gets the current game; the last page seen is kept and used when the network fails or takes more than four seconds.                                                         |
| `/immutable/*`  | Cache first (names contain a content hash). The first screen's files are fetched at install; everything else is kept the first time it is used. Nothing is downloaded "just in case" — not the 3D code, not a world. |
| Everything else | Network, falling back to a kept copy if there is one. Never stored.                                                                                                                                                  |

A new worker never calls `skipWaiting`: it waits until the old version's tabs have closed, then deletes the old shell
and every kept file the new build does not contain. What is kept is therefore bounded by the size of one build.
Lookups ignore `Vary`, because browsers send `Origin` with module-script requests and a host that answers
`Vary: Origin` would otherwise make every pre-fetched file unmatchable (found by the offline browser test).

When narration and other media arrive (Phase 04), they will need their own explicit, budgeted policy; this one
deliberately stores nothing outside `/immutable/`.

## Decisions, briefly

| Decision                                                        | Reason                                                                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| No routing library                                              | Five routes; full control of focus, titles and announcements; fewer bytes.                                      |
| No state library                                                | A 30-line store and `useSyncExternalStore` cover it.                                                            |
| Plain CSS + CSS Modules, no CSS-in-JS                           | Keeps the CSP free of `unsafe-inline`; nothing to compute at runtime.                                           |
| Evidence derived from an event log                              | The distinction between independent, guided and assisted cannot be lost or faked by a counter.                  |
| Hand-written service worker                                     | The policy is short enough to read in full and is unit-tested against a fake Cache API.                         |
| Illustration first, 3D second                                   | Instant first paint, and a fallback that is always exercised.                                                   |
| ESLint 10 with `eslint-plugin-jsx-a11y` through an npm override | The plugin's declared peer range stops at ESLint 9, which is no longer supported; it was verified to run on 10. |
| TypeScript 6, not 7                                             | `typescript-eslint` does not yet support 7.                                                                     |
| Node 22 (`engines`, `.nvmrc`)                                   | The version everything here was run on.                                                                         |

## Browser support

Target: current Chrome, Edge, Firefox and Safari, and iOS/iPadOS Safari 16.4 or later. Verified in this phase:
headless Chromium locally, and Chromium and WebKit in CI. Not verified: any physical device, Firefox, real Safari. See
`docs/TEST_RESULTS.md`.
