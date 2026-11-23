# Continue here

**All six worlds are open: every activity their pages promised is built. Phases 01 to 03 are complete; phases 04 to
10 are each partly done, and `docs/PROGRESS.md` says item by item what is missing. Phase 11 has not been
started.**

- **Date:** 2026-11-23
- **Where it is:** on `main`: phases 01 to 03, the engine for every kind of game, the voice, and Number Garden's
  seven activities (pull request #5, which the owner merged on 2026-11-23 while the rest was being built). On
  pull request [#6](https://github.com/JaredVogler2/Training_Academy/pull/6), from
  `claude/zealous-carson-qyiipa`: the other five worlds, and these documents.
- **Deployed:** the owner connected the repository to Vercel. Production is `main`, at
  `https://training-academy-dun.vercel.app`: Number Garden with all seven activities and its voice is live
  there, and the other five worlds say they are not open (checked on 2026-11-23). **The other five worlds are
  not deployed.** They go live when their pull request is merged, which is the owner's decision.

## The one thing that matters most now

**Nobody has listened to the voice, and nobody has played.** The game now talks: 395 recordings, made by a speech
synthesiser ahead of time and shipped with it. Each was checked by a speech recogniser, which is a machine's
opinion of the words and says nothing about whether a line sounds right to a child. The briefs call the accuracy
of the audio a release gate, and that gate has not been passed.

What to do about it is small and is already in the game: **Grown-ups → _The voice: listen to every recording_**
plays each clip beside what it should say and lets it be marked as sounding right or wrong; the wrong ones are
listed to send on. Reading Cove matters most (100 clips): its lessons are about sounds. Thirteen single words there
were recognised only when said inside a sentence, and are marked so.

The same is true of the pictures and the activities themselves. Each was looked at on a desk at several sizes,
and no child has seen one.

## The state, in one paragraph

A static React and TypeScript app builds to `dist/` and runs under the same headers and routing that `vercel.json`
gives it. A visit opens on a front door; behind it is the map, six islands round a lighthouse, and all six are
open. An island's page offers the next thing to play as one large button and every activity as a picture. There
are **39 activities and 429 challenges**: sounds, letters and blending in Reading Cove; amounts, counting and
comparing in Number Garden; a robot to steer and a row of steps to mend in Robot Ridge; pairs, hidden things,
orders and three ways to remember in Memory Forest; guesses that are tested and things to mend in Inventor
Island; stories to put in order, why things happen and a map to answer on in Explorer Harbor. Each activity is
shown first by Glim, then tried with help at hand, then tried alone, and what a child did alone and at the first
try is kept apart from everything else. Every challenge is written out in a file, made from tables by a
generator and refused by its world's rules unless its answer is the one right answer. Everything is saved on
the device.

## Verified

- `npm run verify:release` on this tree: format, lint, types, **1375 unit tests**, the production build and
  **1066 build checks** pass. The **654 browser tests** (headless Chromium on seven screen shapes, two of them
  a Pixel 7 upright and sideways) were run in full: **599 passed, 47 were skipped by design, and 8 failed** —
  all eight a new accessibility test's own mistake, which expected one demonstration where the four activities
  about letters have three or four. The test was corrected, and it and the spec that plays every activity were
  run again on a desktop and a phone: 121 passed. `docs/TEST_RESULTS.md` has the run in full.
- **Every activity is played to its end by a browser test**, with the answers its content says are right
  (`e2e/everything.spec.ts`; Robot Ridge and Inventor Island in their own specs, which work out what to do from
  what is on the screen).
- **Every world's page and every activity passes the automated accessibility checks**, while it is shown and
  while it is asked (`e2e/a11y-worlds.spec.ts`, and the two worlds' own specs).
- Every content pack is exactly what its generator writes, and every rule that can refuse a challenge has been
  shown to fire (`tests/content/`).
- Every browser test also fails on any console error or warning, failed request, or request to another origin.
- Against the live site, as `main` has it (Number Garden complete, with its voice): the sixteen smoke tests
  passed on 2026-11-23, in Chromium as a desktop and as a phone, and Number Garden's first activity fetched its
  recordings from the site itself. `docs/TEST_RESULTS.md` → _The live site_.
- CI on the pull request: see `docs/TEST_RESULTS.md` → _Continuous integration_.

Details, including every command and count: `docs/TEST_RESULTS.md`. How it looks, rated honestly, and what the
review found: `docs/QUALITY_REPORT.md`.

## Not verified — read this before relying on anything

- **The voice.** No person has listened to any recording (above).
- **No child, no teacher, no speech specialist** has seen any of it. Whether a four-year-old understands a
  demonstration, enjoys an activity or learns from it is not known.
- **No real device, by this project's own testing.** The owner has opened the live site on an iPhone and sent
  screenshots of two world pages, which is the first time it has been seen on one; nothing has been played there
  to my knowledge, and nothing has been heard. The named devices in the tests are the right screen, pixel
  ratio, touch and user agent on desktop engines.
- **Sound on a phone.** That the first tap is heard, that an iPhone on silent still plays, that a recording
  starts on time over a slow connection: reasoned and unit-tested, none heard.
- **Five of the six worlds on Vercel's production.** Not deployed, so not tested there. Vercel builds a preview of the pull request, behind its sign-in; it was not opened.
- **WebKit, here.** Safari's engine runs only in CI.
- **No real graphics hardware.** The 3D hub has only ever been drawn by a software renderer.
- No Firefox. No screenshot-comparison tests.

## What the owner can do now

1. **Listen to the voice** (above), on the phone the game is for. Mark what sounds wrong.
2. **Play one activity in each world with a child**, and say what happened.
3. **Review and merge pull request #6**, if the other five worlds should go live. Merging publishes them.
4. **Decide what comes next.** Each world's brief asks for more than its page did (`docs/PROGRESS.md`); the
   largest gaps are sentences to read, numerals, and a real map. Or Phase 11, music.
5. **Decide the guide's name.** "Glim" is provisional and unchecked; it is one string in `src/app/strings.ts`.

## The next action

Start a new session with:

> Read prompt-series/README.md, prompt-series/00_MASTER_BRIEF.md and
> prompt-series/11_MUSIC_AND_ADDITIONAL_SKILLS.md, then docs/CONTINUE_HERE.md, docs/PROGRESS.md,
> docs/CURRICULUM.md and docs/ARCHITECTURE.md. Implement phase 11. It must work on Android and iOS devices on a
> Vercel deployment.

Or, to close gaps first, name the world and the rows of its table in `docs/PROGRESS.md`.

First steps, in order:

1. `npm ci`, then `npm run verify:release`, to confirm the starting point is green.
2. If anything has been learned from a real phone, a child or a listener since this was written, fix that first.
   A recording that sounds wrong is put right by changing its words in the world's generator
   (`scripts/content/`) or `src/voice/lines.json` and making it again (`scripts/voice/README.md`).
3. Read `docs/ARCHITECTURE.md` → _The learning engine_, _The lesson frame_ and _The voice_.
4. Read `docs/QUALITY_REPORT.md` → _Phases 04 to 10_ → _What is still wrong or weak_.

## Things the next session should know

**Rules the tools enforce**

- `src/engine` is pure: no clock, no random source, no DOM. ESLint fails otherwise. Time, ids and seeds come from
  `src/game/services.ts`.
- `three` and `@react-three/*` may be imported only under `src/render/hub3d`. `npm run verify:dist` also fails if 3D
  code, the studio or the character sheet becomes reachable from the first screen.
- Size budgets live in `scripts/verify-dist.mjs`. Raising one is a decision; say why in the commit.
- The Content-Security-Policy allows no inline script or style and no other origin. Styling is CSS Modules. A model or
  texture loader that fetches `blob:` URLs will need `connect-src` widened deliberately.
- Every browser test fails on any console warning. Allow a specific message in the one test that expects it; do not
  widen the lists in `e2e/fixtures.ts` without a reason written next to the entry.
- **Every asset is in `docs/assets.manifest.json`**, or the unit tests fail. No file the game ships may contain the
  address of another site.
- **Every island model must fit the room the layout gives it**, and nothing may float over an island, a name or the
  guide: `tests/render/` measures both.

**The hub's pictures must be re-rendered when a model changes**

```bash
npm run build
```

```bash
npm run art:sprites
```

```bash
npm run build
```

A unit test fails until this is done, whenever anything under `src/render/hub3d/` that affects how an island looks
(the kit, the paint, the water, the light, a model) or `src/render/extents.ts` has changed. Commit the new pictures.

**New in Phases 04 to 10**

- **A challenge is a choice or a thing to make.** A thing to make is judged by a rule in `src/engine/tasks.ts`,
  and its answer is written as tokens joined by hyphens, so that the record of an attempt did not have to change.
- **A new kind of game is a new board**, registered by its world under the kind of task or the scene it is for
  (`boards` in the world's module). A board draws what the engine shows and plays the script its world writes;
  `useChoosing` (`src/game/lesson/boards/`) is everything a question with choices needs worked out.
- **Content is never edited by hand.** Change the tables in `scripts/content/<world>.mjs` and run
  `npm run content`; a test fails if a pack differs from what its generator writes. A new rule in
  `src/content/rules/` needs a case that breaks it in `tests/content/`, or the test that reads the rules fails.
- **A line that is spoken has a recording, or a test fails** (`tests/config/voice.test.ts`). Make recordings
  with `scripts/voice/make_voice.py` (its README says how; the tools are not part of the game's dependencies),
  then `npx prettier --write src/voice`. A line the recogniser hears differently is reworded, not shipped.
- **The content layer may not import from the game** (ESLint). What a world's rules and its drawing both need —
  a storybook, the maths of a map — lives under `src/content/<world>/`.
- **What is covered is not in the page.** A thing to remember, a missing picture, the answer to anything: none
  is rendered until the engine shows it. Tests look for it in the page and must not find it.
- **A place to press on a map is 56 points or more however small the map**, so places are a third of a map
  apart (`APART` in `src/content/explorer-harbor/maps.ts`).
- **A copy of the repository inside it slows the linter.** Agents work in `.claude/worktrees/`; remove a
  worktree when its work has been merged.

**New in Phase 03**

- **A visit begins at the front door** unless the tab remembers that it has begun (`sessionStorage`, key in
  `src/app/journey.ts`). Browser tests start past it by default; `test.use({ frontDoor: true })` arrives at it.
- **The lesson frame draws what the engine shows and nothing more.** `view.challenge.answer` is in the view; the
  frame must not use it to mark anything unless `view.shownAnswer` says so or the step has been answered.
- **A script's timings and the counting animation's are the same numbers** (`HOP_*` in
  `src/game/lesson/script.ts`, and `numberGarden.module.css`). Change one, change the other.
- **A world that is not about amounts** leaves `countable` out of its module and gets scripts with no counting.
  Its own way of showing belongs in `script.ts` as new beats, tested there.
- **Sizes read back from a browser are floats.** Compare to half a pixel. And measure after things have arrived
  (`arrived()` in `e2e/fixtures.ts`): something popping in is smaller while it does, and a page fading in fails
  contrast checks.
- **A click by force proves nothing about what can be tapped.** Ask the browser what is at the point
  (`document.elementFromPoint`).
- **Child's controls are 56 pixels or more, grown-ups' 48.** `npm run screens -- phase-NN clickmaps` shows every
  control measured; look at the red and amber ones.
- **Nothing may be selectable or long-pressable in the game**; mark anything written for grown-ups
  `data-selectable`.
- **Read a notch's margins only through `--safe-top` and the rest** (`src/styles/tokens.css`), never `env()`
  directly: that is what lets a test give a page a notch (`giveNotch`), and a new screen should be added to the
  notch test in `e2e/phones.spec.ts`.
- **A device profile is kinder than the device.** A phone held sideways leaves a page 250 to 280 pixels of height,
  not the 342 to 360 of the profiles, and an iPhone gives a page its whole width with margins to keep clear of.
  Try a new screen at 800×264 and 640×256, and with a notch, before calling it done.
- **Whatever a child presses must be a link or a button** (or `role="button"`): that is what a tap made beside a
  resting finger is answered on (`src/app/touch.ts`). Something that listens for `click` on a plain element will
  not answer while another finger is on the screen.

**Traps already stepped in**

- **A phone hides overflow from the page.** Chromium's phone emulation (and real phones) widen the layout viewport
  to fit content that is too wide, so `scrollWidth === innerWidth` even when the page is broken. Use `screenFit()`
  from `e2e/fixtures.ts`.
- **Anything that never stops moving must move in steps, on the shared half-second beat.** Twenty small stepped
  animations, each on its own clock, kept a quarter of a processor core busy on the picture hub; on one beat, an
  eighth. Measure anything that moves with `npm run measure:idle` before leaving it on a screen people sit on.
- **A CSS transform animation replaces an SVG element's `transform` attribute.** Put the position on a parent group
  and animate the child.
- **`block()` in the modelling kit measures what it is asked to**, bevel included. (It did not at first, and every
  door was fatter than drawn.)
- **A landmark that stands back on its island is drawn higher than one in the middle.** Room is measured as drawn on
  screen; the model test will say so.
- **"Complete" is not "drawn".** A picture still being decoded is left out of a screenshot. Use
  `hubPicturesLoaded()` from `e2e/fixtures.ts` before looking at pixels.
- **Do not load optional code with `React.lazy`** where failure is ordinary: it throws during rendering, and React
  sometimes reports even a recovered error on the console. `HubStage.tsx` shows the alternative.
- **Software-rendered 3D is unusable** (two to eight frames a second), so on "automatic" a software renderer keeps
  the picture. The 3D browser tests therefore ask for a tier by name (`graphics: 'low'`), and anything that must
  catch a moment — a wave, a hop — is tested or captured with the hub as a picture.
- **Neither timings on this machine nor one CI run say how long the browser tests take in CI.** The same tests in
  the same order have taken 7.8, 9.2 and 11.7 minutes there. And there, a test that ends with the 3D scene still
  moving leaves the next test in the same browser five to thirty seconds late, which never happens here. Tests
  that have the scene drawn in software are allowed three minutes (`SOFTWARE_3D_TIMEOUT` in `e2e/hub.spec.ts`), and
  a new one needs the same. Judge a change to how the tests are scheduled by several CI runs, not one. And read the
  times in a green run now and then: a test near its limit says so there before it ever fails.
- **A slow machine opens the grown-ups gate late.** Tests hold the button until the area appears (`holdGateOpen`),
  never for a fixed time.
- **WebKit keeps a failed preload.** Do not re-enable `<link rel="modulepreload">` for on-demand parts
  (`build.modulePreload` in `vite.config.ts`).
- **The preview server reads `vercel.json` once**, at start. Restart it after changing headers or rewrites.
- **The browser tests start their own server on port 4173** and refuse to reuse one. Stop any preview first. Do not
  rebuild `dist/` while a test or a capture is running.
- **React Three Fiber 9 with three.js r183 or later** logs one deprecation notice; `src/render/hub3d/threeConsole.ts`
  filters exactly that text. Check it when either library is upgraded.
- **The cloud container this was built in has Chromium only and no GPU.** WebKit runs in CI. Frame rates measured
  there mean nothing.

**Open questions for the owner**

- What did the voice sound like, and which recordings are wrong?
- Is a synthesised voice acceptable to ship, or should a person record it? (The lines are all in one manifest.)
- What happened when a child played?
- Who reviews the phonics content? Reading Cove teaches letters through key words and records no sound on its
  own; a reading teacher may want it otherwise.
- Is "Glim" the guide's name?
- Should the project carry a licence file? It has none.

## Where things are

| For                                    | Look in                                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| How it should look, move and sound     | `docs/ART_DIRECTION.md`                                                           |
| How it is built, and why               | `docs/ARCHITECTURE.md`                                                            |
| What was run and what was found        | `docs/TEST_RESULTS.md`                                                            |
| How it looks now, and what is weak     | `docs/QUALITY_REPORT.md`                                                          |
| Phase status and gaps carried forward  | `docs/PROGRESS.md`                                                                |
| Assets, licences, how assets are made  | `docs/ASSETS.md`, `docs/assets.manifest.json`                                     |
| Authoring content                      | `docs/CURRICULUM.md`                                                              |
| Making and checking the voice          | `scripts/voice/README.md`                                                         |
| Deploying                              | `docs/DEPLOYMENT.md`                                                              |
| Screenshots of the running build       | `docs/review/phase-03/` (hub: `phase-02/`); the six worlds: `docs/review/worlds/` |
| Getting it onto a phone; what to check | `docs/DEPLOYMENT.md`                                                              |
| One island close up; the guide's sheet | `/studio/<island>`, `/studio/guide` in the build                                  |
