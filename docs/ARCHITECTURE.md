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
  audio/     The audio engine: unlock on first touch, mute, a handful of synthesised cues, the voice, and
             instruments made from oscillators (the Music Lab's notes) with a clock to put them on a beat.
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

| Function                                                                                | What it does                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createSession(lesson, { id, profileId, seed, now, contentVersion })`                   | Plans one sitting: demonstrations, then guided steps, then `count` independent probes drawn from the lesson's pool by the seed. The undrawn pool is kept as a reserve.                                                                                                                         |
| `getNextChallenge(session, lesson)`                                                     | A pure read: what to show now (challenge, choices in a stable seeded order, which are still available, hints left), or `null` when finished.                                                                                                                                                   |
| `advanceDemo(session, lesson, now)`                                                     | Moves past a demonstration. Nothing is asked and nothing is recorded.                                                                                                                                                                                                                          |
| `submitAttempt(session, lesson, { key, response, now, day, durationMs, adultAssist? })` | Decides correctness; returns the next session and the `Attempt` to store, or a rejection (`stale`, `completed`, `not-answerable`, `unknown-choice`, `unavailable-choice`, `malformed`) that changes nothing. `response` is a choice's id, or a made thing written as tokens joined by hyphens. |
| `getHint(session, lesson, now)`                                                         | Shows the next rung of the challenge's authored hint ladder (`model`, then `eliminate` a choice or give a `step` of a thing to make, then `reveal`). From then on, the answer to that challenge is recorded as assisted.                                                                       |
| `getSkillEvidence(attempts, skillId, policy?)`                                          | Derives what the record says about one skill.                                                                                                                                                                                                                                                  |
| `summarizeSession(session, lesson)`                                                     | Tallies for the end-of-lesson line shown to a grown-up.                                                                                                                                                                                                                                        |

Things worth knowing:

- **A challenge is a choice or a thing to make.** A `choose-one` challenge has choices and one right answer. A
  `make` challenge has a task — give an amount, put cards in order, repeat an order, pick some out, find pairs,
  write a row of steps for a robot, change the parts of a thing until it works, tap along with a beat, make up
  a tune with a shape — and `judgeTask` (`src/engine/tasks.ts`) says whether what was made is right, which
  parts of it were (they are kept), and whether it was done cleanly. Anything that satisfies the rule is right:
  a robot's row is run (`src/engine/robot.ts`, which also has the solver the content is checked with), a
  design is tested by a small exact model (`src/engine/models.ts`), and a tune is asked only whether it has
  the shape (`src/engine/music.ts`). There is no list of accepted answers to drift out of date.
- **A made thing is written as text** — `egg1-egg2-egg3`, `x2-f-f-l`, `c4-e4-g4`, `on-on-late-on-x1` — so an
  attempt's record is the same shape for every kind of game, and the format a saved copy is written in did not
  change.
- **Time is never read by the engine, even to judge a beat.** The board that hears the taps hands them to
  `keepTime` as numbers on the page's clock beside the beats' own numbers, and what comes back — a mark for
  each beat, and how many taps belonged to none — is the answer the engine is given. `keepTime` is pure, and
  its tests are sums.
- **What a picture of a number stands for is worked out, not written down.** Number Garden's later questions
  are asked with pictures only that world draws — a numeral, a staircase of towers with one missing, a frame of
  five or ten places, a path of numbered stones, a story in which some come or go — and the engine carries each
  as a `scene` it never looks inside. `src/engine/numbers.ts` reads one into something that can be reasoned
  about, refuses one that is not well made (stairs that do not go up by one, more leaving than were there),
  and says the one amount it stands for: how many it shows, or how many it asks for. The content rules, the
  scripts and the drawings all ask it, so the three cannot disagree about what the answer to a picture is.
- **Reading Cove's later pictures are read the same way**, by `src/engine/reading.ts`: a word to find a rhyme
  for, a word to clap, a card of one to three claps, a sentence in print, and one thing on or in another. It
  says what a picture is and refuses one that is not well made (four claps; a thing on itself); it knows a
  sentence and the picture it tells of as two ways of writing one thing. It does not know a word: how a word
  ends, how it is spelt sound by sound and how many beats it has are the lexicon's (`src/art/lexicon.json`),
  and the rules look them up there.
- **A wrong answer is never a dead end.** A choice just tried is taken away and the child tries again; when only
  the right choice is left it is revealed, and tapping it completes the challenge as an assisted solve. A made
  thing keeps what was right in it; after three wrong tries (unless the challenge says otherwise) the answer is
  shown, to be followed.
- **A lesson can end with a question of its own** (`plan.closing`): one or two challenges asked last of all, after
  any re-probe. Memory Forest uses it to ask about the very start of a sitting.
- **A place is kept by the lesson's version.** A sitting left unfinished is taken up where it was left if the
  lesson is still the version it was begun in and has every challenge the sitting still needs; the world's
  content may have grown meanwhile, and what is answered afterwards is recorded against the content as it then
  is. A lesson cannot change without a new version: each is written down with a mark made from the whole of it
  (`src/content/lessons.lock.json`), and the content build and a test refuse one that differs.
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
| `LessonSession`                                | One sitting: seed, planned steps, cursor, the current presentation's tries/hints/eliminated choices/parts given, tallies.                                                                                                 |
| `Attempt`                                      | One response: skill, challenge, variant, stage, try index, hint level, assistance, outcome, the choice, a misconception tag, time, local day, bounded duration, content versions. No free text, no coordinates, no audio. |

IDs: skills are dotted (`math.quantity.match-sets-to-3`); lessons are URL-safe slugs (`ng-same-amount-01`) because they
appear in addresses; challenges are `lesson-id.local-name`.

## Content

`src/content/packs/<world>.v<contentVersion>.json`, loaded by `loadPack(world)` with a dynamic import, so each pack is
its own chunk. A pack that fails the schema is refused, never half-used.

**Packs are written by generators.** `scripts/content/<world>.mjs` turns short tables of what to ask into the
full, explicit pack; `npm run content` writes all six, and the files are committed. The game itself never makes
a challenge up. `tests/content/generated.test.ts` fails if a pack file is not exactly what its generator writes,
so a table changed without running the generator, or a pack edited by hand, is found out. Generators draw on a
seeded random source where they sample (the maps of Explorer Harbor, some of Robot Ridge's grounds), so they
write the same thing every time.

**Packs are refused by rules.** `src/content/lint.ts` checks what a schema cannot — references, the prerequisite
graph, plan arithmetic, hint ladders, and that each task's marked solution is one its rule accepts. Then the
world's own rules (`src/content/rules/<world>.ts`) check that the marked answer is the one and only right answer
to what that world asks: one group with the amount; one word that starts with the sound, and no letter not yet
taught in anything to read; one picture that was among those hidden; a row that takes the robot to the star and,
where the lesson is about doing it again, cannot without; a flag that is plainly on water, worked out from the
map's numbers. A pack whose world has no rules is refused. The lint and the rules run in `tests/content`; they
are not shipped to the browser.

What a world's rules and its drawing both need lives in the content layer, because that layer may not import
from the game (ESLint enforces it): `src/art/lexicon.json` (what each kit picture is called and how it is spelt),
`src/content/explorer-harbor/storybook.json` (the stories and the changes with a cause) and
`src/content/explorer-harbor/maps.ts` (the maths of a map: what counts as on land, as nearest, as far enough
apart to press).

See `docs/CURRICULUM.md` for the authoring conventions and what is authored.

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
  `/world/:world`, `/world/:world/play/:lessonId`, `/world/:world/room` (where a world has a room to play in),
  `/how-to-play`, `/grown-ups`, `/studio/:view` (a workbench, linked from nowhere: one island close up, or the
  guide's character sheet) and a not-found page. Links are real anchors. After a
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
- **More than one finger, or a slow one** (`app/touch.ts`): a browser answers a tap only while it is the one finger on
  the screen. A tap made while a thumb rests over the edge of a phone, or a hand leans on a tablet, produces no click
  at all — measured in Chromium's touch handling, which Chrome on Android shares. So a press by one finger that begins
  and ends on the same link or button, within a second and 24 pixels, while another finger is down, is answered with
  the click the browser did not make. So is a slow press by one finger, of between about a third of a second and a
  second: a phone's browser takes that for a long press, which it answers with a menu of its own or with nothing. The
  browser is given 100 ms to answer first, and if it answers late instead its click is dropped, so nothing is ever
  answered twice. One quick finger, fields, scrolling and zooming are left to the browser, and a finger that stays
  longer than a second was resting. The first is tested by sending real touch sequences through Chromium; the second
  could only be unit-tested, because a browser on a desk does click after a slow press. Neither has been tried on a
  phone.
- **The page itself** (`styles/base.css`): it does not bounce and a pull does not reload it
  (`overscroll-behavior: none`, on the root element and on the body, since browsers differ in which they read), and
  two quick taps never zoom (`touch-action: manipulation` on the root). Two fingers still zoom, everywhere: the
  page is never made impossible to enlarge.
- **A notch and a home bar** (`styles/tokens.css`): the four safe-area insets are read in one place, into
  `--safe-top` and the rest, and every rule uses those. The bar, the map, the front door and the activity pad
  themselves by them; a centred reading page takes `--side`, the gutter and the worse of the two side insets.
  Because nothing reads the insets directly, a test can give a page a notch by setting four properties
  (`giveNotch` in `e2e/fixtures.ts`), which no desktop browser will do for it.
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

Someone who has never played goes from the door to "how to play" (below, under _First-visit help_) and from
there to the islands; everyone else goes straight to the islands. "Never played" is two facts about the player
(`isNewToTheGame` in `game/profiles.ts`): they have not been shown how to play, and they have never begun an
activity. The second is there for the children who were playing before there was anything to show.

`index.html` carries one more thing for a first paint: a notice, revealed by a CSS animation after eight seconds,
that the browser may be too old. The game removes it when it starts; if the game's code cannot be parsed at all,
it is the only thing that can say so.

## The hub

The hub is the map: Academy Rock, with its lighthouse, and six islands in a sea. Each of the seven is a link:
the islands to their worlds, the lighthouse to the Music Lab. It is drawn twice — as a picture and in
real-time 3D — and navigated once, through ordinary links laid over whichever is showing.

### One layout, three users

`render/archipelago.ts` is plain arithmetic with no graphics library in it. Given the size of the screen and the part
of it the top bar leaves free, it returns a **frame**: which of five arrangements to use (tall phone, upright
tablet, squarish window, wide screen, and one row for a very flat one), how many pixels a world unit takes, and
where each island's middle lands. On a flat screen it fits both the low ring and the single row and keeps
whichever draws the islands larger: a phone held sideways leaves a page as little as 250 pixels of height once
its browser's bars are counted, and the ring is three rows deep. In the row the guide is moored in front of the
lighthouse, at a distance worked out from the size things are drawn at.

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
each island is given; and `placeOf`, which says where each world is. `tests/render/archipelago.test.ts` checks,
for twenty-five screen shapes, that every island's tap area is at least 96 pixels square (90 and 81 wide on
the two narrowest phones held sideways) and the lighthouse's in proportion (its island is a little smaller),
that no two of the seven overlap, that every name fits under its place, and that the guide, the boats, the
rocks and the clouds are clear of all of them.

**The lighthouse has its name under it in every arrangement but one.** Where the places stand in one row the
guide is moored directly in front of it, and a very flat screen has no height for a name and a guide both
(`hasName`). There the lighthouse is the whole of its own tap area and is still called the Music Lab to
anything that asks a link its name. Elsewhere its name is a neighbour like any other: a name may be wider than
its island only as far as half the water to the next name on its level, which is why, on a wide screen, the
lighthouse is set a little nearer than the two far islands and not between them.

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

## Worlds and their activities

`game/worlds.ts` lists the seven worlds with grown-up-readable descriptions, and for each of its activities the
lessons that make it up and something to try together away from the screen. An activity with no lessons is not
built, and a world with none shows a plain "not open yet" page with nothing that looks tappable; every world
now has lessons for every activity, so no such page is reachable, and the code for it remains. A world may
also have a room to play in freely (`room`: the Music Lab's, at `/world/music-lab/room`, where nothing is
asked and nothing is kept) and a list of what could be built there one day and has not been (`later`), which
its page shows to the grown-up as a list to read and nothing more.

**A world is not a place on the map.** Six worlds have an island each; the Music Lab is in the lighthouse.
`placeOf(world)` (`src/render/extents.ts`) says where a world is, and everything that draws or measures the map
deals in places.

`game/progress.ts` reads which lessons a player has finished, and from that the next lesson in a world and the
next world: what a world's large Play button goes to, and where Glim points on the map. Nothing is locked.

`game/worlds/modules.ts` is the registry of per-world code. Each world has a module, fetched with its content
pack on entering that world and never before:

| A module gives | What it is                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Picture`      | How a stimulus is drawn, as a question, a choice or a card; lit when it is named; with its gap filled when its question has been answered            |
| `describe`     | The same picture in words, for a screen reader                                                                                                       |
| `countable`    | How many things a picture holds, where counting is how the world teaches (Number Garden only)                                                        |
| `chooseScript` | How the world shows off a question with choices: counting, saying a word slowly, uncovering and covering, telling a story as far as it goes          |
| `makeScript`   | The same for a thing to make, where the world has more to say than the board (a story told back picture by picture)                                  |
| `soundOf`      | The recording a picture makes of its own accord when lit or tapped (a drum)                                                                          |
| `toneOf`       | The note a picture plays when it is tapped, where it is an instrument (a chime bar's own pitch)                                                      |
| `echoLayout`   | `row`, where things to repeat stand in a row in their own order with nothing round them, like the bars of a keyboard                                 |
| `boards`       | Boards for games only this world has, by the kind of task (`program`, `design`, `give`, `beat`, `tune`) or the scene asked about (`scene:map`)       |
| `linesFor`     | Lines a challenge is told with beside its own, to be fetched before they are wanted: a story's lines; in Reading Cove, every clip its script may say |
| `voice`        | Where this world's recordings are and how long each lasts                                                                                            |

`game/lessonRunner.ts` runs one sitting: resume or create, answer, hint, next, restart. It updates the screen first and
saves second; a failed save never interrupts a child (the lesson continues in memory and says it is not saved).

### The lesson frame

`game/lesson/` is the frame every world's activities are played in. On the `play` route it has the whole screen:
the shell's top bar is not rendered there.

| Part                | What it does                                                                                                                                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LessonView.tsx`    | Draws what the runner says: a bar (home, steps, help, pause), a board, and the end of the sitting. Where a lesson needs sound and there is none, a gate with one button. It never decides what is right.                                                                                              |
| `Stage.ts`          | Chooses the board: the world's own for this kind of task or scene if it has one, otherwise the frame's.                                                                                                                                                                                               |
| `boards/`           | The frame's boards: a question with choices; things to pick out; an order to make or to repeat; pairs to find. `useChoosing` is everything a question with choices needs worked out, for any board that draws one (a map does).                                                                       |
| `frame.tsx`         | What every board shares: what a board is given, the foot (Glim, what Glim is saying, the way on or "Done"), and the small decisions that are the same whatever the game.                                                                                                                              |
| `script.ts`         | Pure. A script is beats (`rest`, `ask`, `count` a group, `name` one thing, `glance`, `do` a part, `same`) and sounds (a counting note, a cue, a stroke of an instrument, a line to say) on a clock, with where the board settles. A line waits for its recording only if heard.                       |
| `useScript.ts`      | Plays a script with timers: the current beat, and the sounds as they fall due. A new run starts from the top; paused or out of sight, nothing plays and the voice stops; with calm motion the board goes straight to where it settles.                                                                |
| `PauseSheet.tsx`    | A modal `<dialog>`: one button to carry on, the way home, the sound and calm-motion switches, and the switch a grown-up holds down to say they are helping. Opened by the pause button, and by the page going out of sight — so the tap that carries on is also the touch that wakes a phone's audio. |
| `useNudge.ts`       | Help with the screen: watches for taps that press nothing and says what there is to press (_First-visit help_, below).                                                                                                                                                                                |
| `Lesson.module.css` | One screen, no scrolling, from 320 pixels wide to a desktop, and down to the 342 pixels of height Safari leaves on a phone held sideways.                                                                                                                                                             |

Three things the frame does that are easy to undo by accident:

- **The answer is shown only when the engine shows it** (`view.shownAnswer`, or an answer already given). In a
  demonstration it is additionally held back until the script reaches it.
- **Glim is the "show me again" button.** It restarts the current script and tells the engine nothing: asking is
  not help.
- **A world says what can be counted** (`WorldModule.countable`). The frame knows nothing about amounts; a world
  that teaches some other way leaves it out and gets scripts with no counting in them.
- **What is covered is not in the page.** A group to be taken in at a glance, things to remember, the cards to
  answer with while those are on show, a missing picture: none is rendered until the engine shows it.
- **Asking again is not help; another look is.** Glim says the words again and shows nothing that the question
  hides. Uncovering a thing a second time is a hint, asked for and recorded as one.
- **What a step keeps belongs to the step.** A board stays on the screen from one step to the next, so that Glim
  does not blink out and in between them. Anything it remembers therefore has to be kept by step
  (`useStepState`), or it is remembered into the next one. Asking again was not, at first: one tap on Glim and
  every later step was taken for a second telling, with nothing shown first (`useAgain` is now by step).
- **A first showing is owed until it has been seen through.** Asking again while a look or an order is still to
  come, or under way, starts the step over with the showing in it; only an asking that comes afterwards is "the
  words and no more" (`ask(seenThrough)`). And from the moment such a question arrives until its showing is
  over, nothing on the board takes a tap: not while the words are said, and not in the pauses between one light
  and the next.
- **A script can open with something.** Until a script's first moment arrives the board is at rest — except
  where the script shows something at its very start, and then that is shown from the first frame
  (`useScript`). A story in Number Garden opens as it stood before anyone moved; at rest it would have been
  drawn, for a frame, already over.
- **A wide picture gets the room.** On a phone held sideways what is asked about stands beside what it is
  answered with, and is given the narrower part. A board says what kind of scene it asks about
  (`data-asks-about`), and the kinds that are wide and are read from left to right — three pictures of a story,
  a staircase, a frame, a path of stones, those who stay and those who go — are given about half. Towers of
  blocks to choose from stand side by side on every screen, since that is how two towers are compared.
- **A button is never put in the place of another.** Where a count has to start from the first thing, what hops
  is made afresh inside a button that stays: a button that is replaced drops a press that is under way, and
  whatever was focused on it.
- **A script can be the question itself.** Two notes, and which was the high one: there is nothing to answer
  until both have sounded, and nothing to answer at all if they are not played. A script that says so
  (`Writer.essential()`) is played even where the person has asked for less movement — what it lights then
  simply goes on and off — and a question with choices takes no answer until the last thing it names has been
  named (`hearing`, in `useChoosing`). Asking again plays the whole of it again, as often as asked.
- **A script can show one part of a thing at a time.** `{ show: 'name', which: 'prompt', part }` is the third
  tile of a word, the fourth word of a sentence, the second place of three. A picture is given `part`; the
  order board lights that place. A script that follows a recording begins the line without waiting for it
  (`Writer.start`) and sets a beat at each moment the recording's marks give (_The voice_, below), so a finger
  steps and a place lights in time with what is said.
- **An order can have a picture to go by.** A thing to make may carry a picture (`prompt.stimulus`); the order
  board shows it above the places (beside them, on a phone held sideways). A word to build from its letters is
  that: the picture of the word, three places, three tiles.

A world's page (`game/world/WorldView.tsx`) shows the island with the world's emblem pinned to it; one large
Play button that goes to the next lesson not yet finished (from where a grown-up has chosen that this player
begins, if they have: _First-visit help_, below); and every lesson as a card with a picture built from that
lesson's own demonstration challenge — so a card cannot show something the activity does not do. Below, for the
grown-up, is what each activity is and something to try together away from the screen.

What has been finished is the player's own, so whatever shows it has to know who is playing
(`game/progress.ts`). The map finds that out as it opens, and so do an activity and the grown-ups' area; a
world's page can be the first thing opened — a page loaded again, a tab a phone has brought back — and asks for
itself if nobody has. (It did not, at first: such a page showed nothing as finished.)

### First-visit help

Four things that phase 04 asked for and that are about the child's first days with the game, not about any one
world. None of them writes anything into what a child has shown.

**How to play** (`game/howto/`, the `how-to` route, its own chunk). Glim shows three things and after each the
child does it: tap the one that is asked for; tap a picture and it goes to its place, then the tick; tap Glim to
have a thing shown again. Then the arrow, which is the way on everywhere.

- `steps.ts` is all of it without a screen, and pure: the state (`HowTo`), what a move does (`move(state, by,
action)`, where `by` is Glim or the child and a move that does not belong to the moment gives the same state
  back), each showing as beats (`showingOf`: after so long, say a line and let Glim make a move), and where
  Glim's hand goes when nothing is tapped (`nextTarget`). A showing keeps time with the voice where the voice
  is heard and gives each line a second and a half where it is not, so the pictures do it all with the sound
  off.
- `HowToPlay.tsx` draws that with **the lesson's own parts**: the classes of `Lesson.module.css` and
  `boards.module.css`, Glim as the "show me again" button, the same tick and the same arrow. It is not a lesson
  and does not go through the engine: there is no question in it, no runner, and nothing to record. A tap on
  the other picture is answered by Glim's hand on the one that is meant.
- It has the whole screen, as an activity has. The house, top left, passes it by at any moment.
- Leaving it, by any road inside the game, writes `howTo: 'seen'` into the player's settings; a tab closed in
  the middle of it writes nothing, so that child is shown it once more. A grown-up can open it again from
  their area.
- Everything in the game is done with a tap. Nothing is dragged, so nothing here shows dragging: a tap is
  within reach of a hand that cannot yet hold a thing down and move it.

**Help with the screen** (`game/lesson/useNudge.ts`). A child who taps the picture that is asked about, or the
words, or a card that is still being shown, has not got anything wrong: they do not know what to press. The
lesson's own element hears every tap first (`onPointerDownCapture`) and sorts it: on something that can be
pressed now; on something that is waiting its turn (`aria-disabled`, `disabled`, inside something `inert`); on
nothing. Three in a row of the last two, within eight seconds, and the lesson points something out for five:

| Where the lesson is                            | What is pointed out         | What is said and written                 |
| ---------------------------------------------- | --------------------------- | ---------------------------------------- |
| Glim is showing                                | The arrow                   | Tap the arrow, and then it is your turn. |
| A question, and something can be answered with | **Every** answer, all alike | Tap one of these.                        |
| Nothing can be pressed yet                     | Nothing                     | Watch and listen first.                  |
| Everything is in its place                     | The tick                    | Have you finished? Tap the tick.         |
| The step has been answered                     | The arrow                   | Tap the arrow to go on.                  |

It never picks out the right answer, it is not a hint (the engine is told nothing, so an answer after it is
still a first try with no help), and it is written down nowhere. The line is said only if nothing else is being
said (`sayLineIfQuiet`): the question is never talked over. The words are written where Glim's are, in the
bubble at the foot (`NudgeWords`, a context the foot reads), because a note drawn over the foot covered the very
button it pointed at. A thing that is finished and left alone for eight seconds has its tick pointed out, once
for that step.

**A grown-up is helping** (`game/helping.ts`). One fact for the life of a tab, like the front door's: on, or
off. It is switched in three places a grown-up looks — the pause screen of any activity, the bar of "how to
play", and a tick box in the grown-ups' area — and in the two that a child can reach it is **held down to
change, either way** (`HoldToggle` in `ui/controls.tsx`): a tap does nothing, so a small finger neither switches
it on (and has every answer of the visit set aside) nor off (and has helped answers counted as the child's own).
The lesson runner asks at each answer (`RunnerDeps.adultHelping`), the engine writes the attempt down with
`assistance: 'adult'`, and nothing so written is ever counted as done alone. While it is on, the activity's
pause button shows the grown-ups' mark and says so in its name.

**Where to begin** (`game/placement.ts`, `parent/WhereToBegin.tsx`). For the grown-up who knows the child. A
player's settings may hold two things: `observed`, what a grown-up says they have seen (six things, each
`seen` or `not-yet`, and absent until they say: "not yet observed" is the absence of a word, never a word of
its own), and `startAt`, where Play begins in a world (a lesson's id). The game suggests a beginning from what
was seen (`suggestedStarts`: counting five things passes over "counting to five"; hearing first sounds begins
the letters; knowing letters' sounds begins blending; knowing a letter by its shape suggests nothing, since its
sound is another matter), and offers it only if it is further on than where Play begins now. The grown-up
takes it or chooses any activity. `nextLessonIn(world, done, startAt)` is the whole of its effect: the first
activity not yet finished from there on, and, once all of those are, the first not yet finished before it.
Nothing is marked as done, no activity is closed, and nothing is written into the record of attempts — which
is the only place "what a child has shown" is read from. There is no quiz: beside each thing is a link to the
real activity in which to watch the child try it.

### Music

The Music Lab's notes are not files. `AudioEngine.tone(timbre, frequency, { at? })` builds one stroke of an
instrument from two or three oscillators — a chime bar (its note, with a bright ring two octaves above that
dies sooner), a pipe (held for a moment, with a small chirp into the note), a drum (a low note that drops to its
pitch, and a knock above it), a click — and schedules it on the audio context. Nothing is recorded, so nothing
is downloaded, licensed or cached, and the whole of it works offline from the first visit. The cost is that
nobody chose these sounds by ear: they are numbers (`strokeOf`), and `docs/QUALITY_REPORT.md` says so.

Two things in it are there for timing. `audio().clock` gives the audio context's own time and, where the
browser reports it, how late a sound is heard after it is played; a click that has to fall on a beat is
scheduled on that clock a beat ahead (`{ at }`), and the light for the same beat is set for the same moment
plus that lateness, so that what is seen and what is heard agree. And an instrument answers a press, not a
click (`usePressNow`, `src/game/worlds/music-lab/press.ts`): a click arrives when the finger lifts, which for a
drum is always late.

`src/engine/music.ts` is the arithmetic: what a note is called and how high it is, whether a tune has a shape,
and `keepTime`, which says how taps kept time with beats. The Music Lab's own code
(`src/game/worlds/music-lab/`) is its pictures, its scripts, a board for the beat, a board for making a tune,
and the room to play in.

### The voice

Every line a child hears is a file made ahead of time. Nothing is synthesised in the browser and nothing is
fetched from another site, because both would break the game's rules about other origins and about working
offline, and because a browser's own speech cannot be checked.

| Part                           | What it does                                                                                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/voice/make_voice.py`  | Not part of the game. Reads every line the packs and `src/voice/lines*.json` ask for, says each with a speech synthesiser, has a speech recogniser listen to it, and writes the clip, its length and what was heard. Its README says how to run it. |
| `src/voice/manifest.json`      | For every clip: its words, its file's hash, how it was checked (`matches`, `in-sentence`, `made` for a sound that is not speech) and whether a person has listened. Nothing is marked as listened to.                                               |
| `src/voice/marks/<group>.json` | For a clip that has several things in it to follow — a word said slowly, a word in its beats, a sentence read aloud — the moment each sound, beat or word begins. Written by the voice tool from the synthesiser's own account of its speech.       |
| `src/assets/voice/en/<group>/` | The clips, one group for each world, one for words shared between worlds, one for lines every activity uses.                                                                                                                                        |
| `src/audio/voice.ts`           | The `Narrator`: fetches a clip when it is first wanted, decodes it on the game's one audio context, keeps a few dozen decoded, says one line at a time, stops on pause and on leaving, and turns the cue sounds down while it speaks.               |
| `src/parent/VoiceCheck.tsx`    | In the grown-ups' area: every clip, what it should say and how it was checked, to play and to mark as sounding right or wrong. The marks stay on the device; the wrong ones are listed to send on.                                                  |

Nothing waits on the voice. A line that cannot be heard — sound off, audio not yet woken by a touch, a download
that failed — is not said, and a script is told it takes no time, so what is shown never stands still for words
nobody hears. A test fails if a line that can be said has no clip, if a clip is not in the manifest, or if any
clip was heard as other words (`tests/config/voice.test.ts`).

**Fetched ahead, and said when said.** A board asks for the lines of a step as the step arrives
(`usePreparedLines`), and a world can add to them everything its script may say for that step
(`WorldModule.linesFor`): Reading Cove names each picture's word, plain, drawn out and slow, and a sentence's
recording. That is so a clip which something moves in time with starts when the moving does. It also means
that a clip's having been fetched says nothing about its having been heard. The page is told each line at the
moment it begins to play — an event on the window, `SAID_EVENT` in `src/audio/index.ts`, with the line's key —
and nothing in the game listens for it: it is there for whatever needs to know from outside, which today is
the browser tests (`listenIn` in `e2e/fixtures.ts`).

## Bundle splitting

| Chunk                                             | When it loads                             |
| ------------------------------------------------- | ----------------------------------------- |
| entry + `react` + `engine` + `profiles`           | first load                                |
| the hub's pictures (WebP)                         | with the first screen, as images          |
| `three`, `r3f`, `harbour`, `Hub3D`                | after the shell, only where 3D is planned |
| `WorldView`, `LessonView`, `GrownUps`             | on first visit to that route              |
| `engine-play` (judging, the robot, the models)    | with the first activity                   |
| a world's code and its content pack, each a chunk | on entering that world                    |
| a recording                                       | the first time its line is wanted         |
| `VoiceCheck` and the voice manifest               | when a grown-up opens the list            |
| `Studio`, `GuideSheet`                            | only at `/studio/…`                       |

The first screen imports the engine's schema only (`@/engine/schema`), so that judging, the robot's interpreter
and the models stay out of it; `npm run verify:dist` fails if any world's code, the 3D code or a recording
becomes reachable from the first screen.

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

For the browser tests the same plugin keeps a note of each page it is asked for, as the request arrives and
again when its answer has been sent (only when `PREVIEW_PAGE_LOG` names a file, which the tests' configuration
does). It is there for a test that runs out of time waiting for a page: the browser's side of that is known, and
this is the server's (`e2e/diagnosis.ts`).

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

What that means for a device that already has the game, when a new build is deployed, is not something a test
that starts from an empty browser can show. `scripts/rehearse-update.mjs` (`npm run rehearse:update -- <the commit
that is live>`) does it with two real builds and one browser that keeps what it has: tabs left open carry on, a
part the old build never fetched says so and offers to load the page again, the site opened again is the new
build at once, a sitting left half-way is taken up, nothing stored is lost, and the old build is cleared out
once its tabs have closed.

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
