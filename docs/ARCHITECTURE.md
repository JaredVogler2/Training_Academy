# Architecture

Training Academy is a static single-page app. There is no server, no account, no database in the cloud and no
runtime secret. Everything a child does is decided by a small headless engine, saved in the browser, and drawn by a
thin React layer. Phase 01 built that foundation and Phase 02 the hub as it now looks; this document describes what
exists and why each choice was made. How things should look and move is in `docs/ART_DIRECTION.md`.

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
  render/    How the hub is drawn: where everything goes (archipelago.ts), the hub as a picture, the WebGL probe,
             quality tiers, and hub3d/ — the modelling kit, the islands, the water — the only folder allowed to
             import three.js.
  assets/    The hub's pictures, rendered from the island models (docs/ASSETS.md).
  ui/        Controls (buttons, toggle, hold button, modal), icons, hand-drawn vector art, and the guide.
  audio/     The audio engine: unlock on first touch, mute, a handful of synthesised cues.
  parent/    The grown-ups area.
  app/       The shell: entry wiring, history router, settings, error boundary, diagnostics, lazy-chunk loader,
             service-worker registration.
  styles/    Design tokens, base styles, bundled fonts.
tests/       Vitest: engine, content, storage, game, app, parent, config, render, ui.
e2e/         Playwright specs, run against the production build.
scripts/     Build plugins (Vercel parity, service worker) and tools (dist verifier, screenshots, icons, the hub's
             pictures, measurements).
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
  `/world/:world`, `/world/:world/play/:lessonId`, `/grown-ups`, `/studio/:view` (a workbench, linked from
  nowhere: one island close up, or the guide's character sheet) and a not-found page. Links are real anchors. After a
  navigation the page title is set, focus moves to `<main>`, and a live region announces the page. Addresses never
  contain a dot, so a static host can tell a page from a file.
- **Settings**: sound on/off; motion `system | full | reduced` (the toggle flips whatever is in effect and makes it
  explicit); graphics `auto | low | medium | high | pictures`. Reduced motion sets `data-motion="reduced"` on `<html>`,
  which collapses every CSS animation and transition, and puts the 3D scene in render-on-demand mode.
- **Layout**: every single-column grid has an explicit shrinkable column, button labels wrap inside the button, and
  long words break, so that no text — a long nickname, a translation, text zoomed to 200% — can make a page wider than
  the screen. The browser tests check this against the real screen size with the longest names the forms accept.
- **Error boundary**: one around the routed view (reset when the address changes). A failed lazy download becomes a
  `ChunkLoadError`, shown as "this part could not be loaded" with a reload button. The hub has its own boundary
  around the 3D scene, whose fallback is simply the picture underneath.
- **Diagnostics** (`app/diagnostics.ts`): marks, lazy-chunk load times, paint and layout-shift vitals where the browser
  reports them, long tasks, hub mode/tier/renderer/frame statistics/draw calls, and errors. Kept in the page's memory
  and shown under Grown-ups → Diagnostics. Nothing is transmitted: the CSP's `connect-src 'self'` and a browser-test
  guard that fails on any cross-origin request both hold that line.
- **Audio** (`audio/audioEngine.ts`): the audio context is created on the first touch and woken on later ones (iOS
  suspends it at will). Waking takes a moment, so a cue asked for in that moment waits for it, up to 0.9 seconds —
  otherwise the sound of the very tap that woke the audio is always lost. Any other cue that cannot play is skipped.
  Eleven short synthesised cues and a climbing note for counting; no audio files. While sound is on, the game asks
  Safari to treat it as media (`navigator.audioSession.type = 'playback'`), so that an iPhone's ring/silent switch
  does not silence a game whose sounds are part of how it teaches. Phase 04 adds recorded narration on top of the
  same handling.
- **A resting finger** (`app/touch.ts`, and `styles/base.css`): nothing in the game can be selected, iOS shows no
  call-out over a link or a picture, and the menu Android opens on a long press is suppressed for touch and pen.
  Anything marked `data-selectable` — what is written for grown-ups — keeps all of it, and a mouse keeps its right
  click.
- **Tooltips** (`styles/base.css`): a control that is only a picture carries its words in `data-tip`; they show on
  hover and on keyboard focus for a fine pointer, and never on a touch screen.
- **Arriving** (`app/App.module.css`): the routed view is keyed by address and fades in over 320 ms. Nothing waits
  for it; calm motion removes it. Tests that measure colour wait for it to finish (`arrived()` in
  `e2e/fixtures.ts`).

### The front door

`app/journey.ts` holds one fact for the life of a tab (in `sessionStorage`): whether this visit has begun. Until it
has, `app/FrontDoor.tsx` stands in front of the hub: Glim, and a picture to tap for each player this device knows —
or, if it knows none, the six pictures to choose from, the tap creating the first player. The hub behind it is
`inert` and stays a picture (`HubStage`'s `waiting` prop: no 3D code is sent for until the door has opened).

The door is only on the home address. A refresh or a deep link into an activity goes straight there, with the
player last chosen. Where storage is refused altogether the door is simply met on every load, and choosing a
picture still opens the game. More players are added in the grown-ups' area, not here.

`index.html` carries one more thing for a first paint: a notice, revealed by a CSS animation after eight seconds,
that the browser may be too old. The game removes it when it starts; if the game's code cannot be parsed at all,
it is the only thing that can say so.

## The hub

The hub is the map: Academy Rock and six islands in a sea, each island a link. It is drawn twice — as a picture and
in real-time 3D — and navigated once, through ordinary links laid over whichever is showing.

### One layout, three users

`render/archipelago.ts` is plain arithmetic with no graphics library in it. Given the size of the screen and the part
of it the top bar leaves free, it returns a **frame**: which of four arrangements to use (tall phone, upright
tablet, squarish window, wide screen), how many pixels a world unit takes, and where each island's middle lands.

The camera never turns and has no perspective, so a point in the world is at

```
across = x          down = z · sin(36°) − height · cos(36°)
```

times the scale, plus an offset. Three things use that one sum, and so agree to the pixel:

| User                             | What it takes from the frame                                          |
| -------------------------------- | --------------------------------------------------------------------- |
| The 3D scene (`hub3d/Scene.tsx`) | The point the camera looks at, and its zoom                           |
| The picture (`HubPicture.tsx`)   | Where to put each island's image, and how large                       |
| The links (`app/Home.tsx`)       | Each island's box on screen — the tap area — and the size of its name |

`render/extents.ts` holds the two things both the layout and the pictures depend on: the camera's angle and the room
each island is given. `tests/render/archipelago.test.ts` checks, for ten screen shapes, that every tap area is at
least 96 pixels square, that no two overlap, that the lighthouse (which is scenery) never lies inside one, that every
name fits under its island, and that the guide, the boats, the rocks and the clouds are clear of all of them.

### What is drawn

`render/HubStage.tsx` decides:

1. The **picture** is on screen from the first paint: seven images of the islands on a sea made of CSS.
2. After the shell is idle, the plan is made (`render/quality.ts`): pictures-only setting → picture; no WebGL 2 →
   picture; on automatic, a device that could only draw 3D in software, or one that has asked to save data → picture;
   otherwise 3D at a tier.
3. The **3D scene** is fetched as its own group of chunks and faded in, in place, after its second rendered frame.
4. A failed download, a render error or a lost graphics context leaves the picture.

So the fallback is a path every visit exercises, not a rarely-run branch. The 3D code is fetched by hand rather than
through `React.lazy`: a lazy component that cannot be downloaded throws during rendering, and React, though it
recovers, sometimes reports that on the console; here it is an ordinary event with an ordinary answer.

The picture is not a second drawing of the hub. Each image is rendered **from the island's 3D model**
(`scripts/render-sprites.mjs`, through the `/studio` route) with the water around it fading to nothing, and placed
by the frame, so when the 3D scene fades in nothing moves. A unit test fails if a model has changed since its picture
was rendered. The picture's own motion — boats, clouds, glints, wave marks — runs in steps on one shared half-second
beat, because on the devices most likely to see it every change of frame is drawn by the processor.

### The 3D scene

Everything under `render/hub3d/`:

| File                     | What it is                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `kit.ts`                 | The modelling kit: rounded blocks, turned shapes, hulls, land with a wandering shore; `Sculpture` merges an island into one mesh        |
| `paint.ts`               | The one material everything solid wears: matte, vertex-coloured, with a brush texture generated on the device, wind, glow, rim and haze |
| `islands/*.ts`           | The seven models: each a function from "how much detail" to one mesh and a few moving parts                                             |
| `floating.ts`            | Boats, rocks, clouds, gulls                                                                                                             |
| `Sea.tsx`                | The water: one plane, one shader; shallows, foam, rings and shadow around every island                                                  |
| `stage.tsx`              | The camera, the light, and how an island is put on stage (and lifted when pointed at)                                                   |
| `Harbour.tsx`            | All of the above together; also the frame-rate and renderer-memory record for Diagnostics                                               |
| `Scene.tsx`, `Hub3D.tsx` | The hub's view of the harbour, and the canvas                                                                                           |
| `Studio.tsx`             | One island on its own: for review, and for rendering the pictures                                                                       |

- **One draw call an island.** Shapes are painted with a colour or a gradient as they are placed, then merged. The whole scene is 24 to 35 draw calls and about 105,000 triangles (about 50,000 on the lowest tier, which cuts its
  curves more coarsely), with every corner stored once.
- **Shadows are drawn once.** The sun and the islands do not move, so the shadow map is redrawn only when the layout
  changes or an island is lifted. Contact shade is painted into the ground itself, so the lowest tier, with no
  shadow map, still has houses that stand on their land.
- **The shore is one formula**, used to build the land and again in the water shader, so the foam follows the land
  exactly.
- **The water is drawn last**, so the part of it under the islands is never shaded.
- **Everything is disposed** with the scene: geometries, the material, the texture. The renderer's counts are shown
  under Diagnostics so a leak would be seen as a number that grows.
- All animation reads one clock, which stops under reduced motion; the canvas then draws only when something
  changes.

Quality tiers (`TIERS` in `render/quality.ts`): `low` (pixel ratio ≤ 1, no shadow map, half the decoration, coarser
curves, plainer water), `medium` (≤ 1.5, 1024 shadow map), `high` (≤ 2, 2048). On automatic, a device with little memory or two
cores gets `low`, a touch device `medium`, otherwise `high`, and Drei's `PerformanceMonitor` may lower the pixel
ratio if frames are slow. A CPU rasteriser (SwiftShader, llvmpipe) is not given 3D on automatic at all: it draws
this scene at two to eight frames a second. An explicit choice of quality is respected as given, on any device.

Two upstream messages are handled deliberately: `shadows="percentage"` avoids a shadow mode three.js has removed, and
`hub3d/threeConsole.ts` filters, by exact text, the one deprecation notice that React Three Fiber 9 triggers by
constructing `THREE.Clock`. Everything else three.js says still reaches the console.

### The guide

`ui/Guide.tsx` is one SVG rigged in parts, with a pose and a motion for each of six states; `data-state` on its root
selects them in CSS. It knows nothing about lessons. `game/lesson/LessonView.tsx` maps what the engine reports to a
state (pointing during a demonstration or a hint, wondering at a new question, glad of a right answer, a tilted head
after a wrong one), and `app/Home.tsx` moors it on the hub, pointing at the island that is open. It is hidden from
assistive technology everywhere: the caption beside it says the same thing in words.

## Worlds and the sample activity

`game/worlds.ts` lists the six worlds with grown-up-readable descriptions and whether anything is playable. A world
that is not built shows a plain "not open yet" page with nothing that looks tappable.

`game/worlds/modules.ts` is the registry of per-world code. Only Number Garden has a module so far (how its pictures
are drawn); it and its content pack are fetched on entering that world.

`game/lessonRunner.ts` runs one sitting: resume or create, answer, hint, next, restart. It updates the screen first and
saves second; a failed save never interrupts a child (the lesson continues in memory and says it is not saved).

### The lesson frame

`game/lesson/` is the frame every world's activities are played in. On the `play` route it has the whole screen:
the shell's top bar is not rendered there.

| Part                | What it does                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LessonView.tsx`    | Draws what the runner says: a bar (home, steps, help, pause), the board (the group and the choices, drawn by the world's module), a foot (Glim, the caption, the way on), and the end of the sitting. It never decides what is right.       |
| `script.ts`         | Pure. From "what has just happened" (stage, event, amounts) it returns a script: beats (`rest`, `ask`, `count` a group, `same`) and sounds on a clock, with where the board settles. Timings match the counting animation in the CSS.       |
| `useScript.ts`      | Plays a script with timers: the current beat, and the notes as they fall due. A new run starts from the top; paused or out of sight, nothing plays; with calm motion the board goes straight to where the script settles.                   |
| `PauseSheet.tsx`    | A modal `<dialog>`: one button to carry on, the way home, and the sound and calm-motion switches. Opened by the pause button, and by the page going out of sight — so the tap that carries on is also the touch that wakes a phone's audio. |
| `Lesson.module.css` | One screen, no scrolling, from 320 pixels wide to a desktop, and down to the 342 pixels of height Safari leaves on a phone held sideways.                                                                                                   |

Three things the frame does that are easy to undo by accident:

- **The answer is shown only when the engine shows it** (`view.shownAnswer`, or an answer already given). In a
  demonstration it is additionally held back until the script reaches it.
- **Glim is the "show me again" button.** It restarts the current script and tells the engine nothing: asking is
  not help.
- **A world says what can be counted** (`WorldModule.countable`). The frame knows nothing about amounts; a world
  that teaches some other way leaves it out and gets scripts with no counting in them.

A world's page (`game/world/WorldView.tsx`) shows the island with the world's emblem pinned to it and, for a world
that is open, an example of the activity built from the lesson's own demonstration challenge — so it cannot show
something the activity does not do.

## Bundle splitting

| Chunk                                                | When it loads                             |
| ---------------------------------------------------- | ----------------------------------------- |
| entry + `react` + `engine` + `profiles`              | first load                                |
| the hub's pictures (WebP)                            | with the first screen, as images          |
| `three`, `r3f`, `harbour`, `Hub3D`                   | after the shell, only where 3D is planned |
| `WorldView`, `LessonView`, `GrownUps`                | on first visit to that route              |
| `number-garden` (code), `number-garden.v1` (content) | on entering Number Garden                 |
| `Studio`, `GuideSheet`                               | only at `/studio/…`                       |

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

Target: current Chrome, Edge, Firefox and Safari; iOS and iPadOS Safari 16.4 or later; Chrome on Android 111 or later.
(The floor is what the build is compiled for — Vite's default, "widely available" browsers — and what the styles use.
An older browser gets the "may be too old" notice instead of a blank page.)

Verified: headless Chromium locally; Chromium and WebKit in CI, including as a Pixel 7, an iPhone 13 and an iPad
(the screen their browsers leave a page, their pixel ratio, touch, their user agent — emulated on desktop engines).
Not verified: any physical device, Firefox, real Safari, real Chrome on Android. See `docs/TEST_RESULTS.md`.
