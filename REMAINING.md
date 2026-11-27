# What remains, and how to pick it up

This file is for a coding agent (or a person) who arrives with the repository and nothing else: no memory of
the sessions that built it, no scratch files and no chat history. It says where the work stands, what is left of
the plan, what was begun and not kept, and the working practices that kept the game sound. It was written on
**2026-11-27**. Check every fact against the repository before acting on it. The code and `git log` win over this
file when they disagree.

The other documents go deeper and are kept truthful: `docs/CONTINUE_HERE.md` (hand-over, what is live, what to
look at first), `docs/PROGRESS.md` (every phase's brief set against what exists), `docs/ARCHITECTURE.md`,
`docs/CURRICULUM.md`, `docs/QUALITY_REPORT.md` (reviews, and what is still wrong), `docs/TEST_RESULTS.md`
(everything that was run), `docs/DEPLOYMENT.md`, `docs/ASSETS.md` and `docs/ART_DIRECTION.md`. The plan is the
seventeen briefs in `prompt-series/` (start with `prompt-series/README.md` and `00_MASTER_BRIEF.md`).

---

## 1. Where things stand

### The product

A browser game for children of about 3½ to 6, built with Vite, React and TypeScript, hosted as a static site on
Vercel. There is no account, no server and no tracking: everything a child does is stored on the device
(IndexedDB, then localStorage, then memory). A map of six islands and a lighthouse (3D where the device can draw
it, a rendered picture where it cannot) leads to seven worlds: Reading Cove, Number Garden, Robot Ridge, Memory
Forest, Inventor Island, Explorer Harbor and the Music Lab. There are 71 activities, 823 challenges and 81
skills, a recorded synthetic voice (736 clips), and a grown-ups' area behind a hold-to-open gate.

### The plan

| Phases | State                                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| 01–11  | Done or built: the foundation, the look, the journey, the voice and first-visit help, and all seven worlds |
| 12     | **Built, on an open pull request (see below). Not merged, so not live**                                    |
| 13     | **Begun and not kept** (section 3). Nothing of it is in the repository                                     |
| 14–17  | Not started as phases. Much of their groundwork exists (section 4)                                         |

"Built" is meant exactly. Nobody has listened to the voice or the music, no child has played, and no teacher has
reviewed the content. The briefs call the accuracy of the audio a release gate, and that gate has not been
passed.

### Git and GitHub, at the time of writing

- `main` is at `cbadaa3`, the merge of pull request #16 (Explorer Harbor's room for making a story, the globe's
  turn mended, and a grown-ups' page that waits for the record). It is live.
- The working branch is `claude/zealous-carson-qyiipa`. Pull request **#17**
  (https://github.com/JaredVogler2/Training_Academy/pull/17) carries **phase 12** in commit `b76c80f`, and this
  file in the commit after it. It is open and not merged.
- **CI on #17.** For `b76c80f`, run 59 had passed lint, types, unit tests and build, and five browser jobs; the rest
  were still running. The workflow cancels a run when a newer commit arrives
  (`concurrency: cancel-in-progress`), so the commit that added this file starts a fresh run, and that run is the
  one to read. **First thing to do: read CI on #17 at its head** (section 2).
- Merging is the owner's decision, and it is a release: Vercel deploys `main` to production. The owner has merged
  every pull request so far soon after its checks went green.

### What is live

`main`, served at the project's Vercel production address (`docs/DEPLOYMENT.md` names it): all seven worlds,
the first-visit help, the story room. After #16 was merged, CI on `main` (run 58) was green in all thirteen jobs
with no test at a second attempt. The merged commit's own browser tests, run against the live address on seven
screens, passed 329 of 329.

### Three faults that are live, mended in #17

1. In Memory Forest's _Find the pairs_, a game finished in far more turns than its board allows is stored as done
   alone, so the grown-ups' area can say "Independent so far" of a child who turned cards over at random.
2. At Inventor Island's shelter, a wall tested with no prop does nothing when "Test it" is pressed.
3. The time stored with an answer counts any pause, up to ten minutes.

Merging #17 changes what is stored, once: data version 2 marks old games of pairs that took too many turns
(`src/storage/migrations.ts`) and changes nothing else. The update was rehearsed from `cbadaa3` to #17's tree
with a game of pairs played on the live build first: 24 of 24.

---

## 2. First steps for whoever picks this up

1. `npm ci`, then `npm run verify:release` (format, lint, types, unit tests, build, build checks, browser tests).
   Browser tests need Playwright's Chromium; the README says how to install it. WebKit runs only in CI. The full
   browser suite takes about an hour on four cores.
2. **Read pull request #17.** If it has merged, start the branch again from the latest `main` (the PR's work is
   already in `main`), check the live site (section 6, "After a merge"), and record it. If it is open:
   - Read every CI job. If any is red, find the root cause and fix it (section 6, "When CI is red"). Never skip,
     disable or quarantine a test to get green.
   - **Look at the artifact sizes even when CI is green.** A report of 0.5–0.9 MB has nothing in it but the
     summary. One of several MB means some test passed only at a second attempt and its traces were kept. Download
     it, read the failure and the trace, and find out why. A test that needs a second attempt has a cause.
   - Phase 12's new browser tests (`e2e/next.spec.ts`) had never run in WebKit before #17's CI.
3. Then carry on with phase 13 (section 3).

---

## 3. Phase 13: the parent dashboard

Brief: `prompt-series/13_PARENT_DASHBOARD.md`. Read it first; this section sets it against the code.

### What the grown-ups' area already has (`src/parent/`)

| Brief's section            | What exists                                                                                                                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Entry challenge            | `Gate` in `GrownUps.tsx`: hold a button for two seconds. It says plainly that it is not a lock                                                                                                                                                                                 |
| 1. Profiles                | `Players`: add (nickname and picture), change, remove, switch. Up to `MAX_PROFILES`. Save a copy, load a copy, erase everything (`Data`)                                                                                                                                       |
| 2. Skill trees             | `Evidence.tsx`: every skill of every world, its status (not yet observed → exploring → guided → practising → independent so far → independent across days) and its counts in words, including what luck could account for. **No "last review", no "next suggested" per skill** |
| (phase 12) What comes next | `NextUp.tsx`: what Play offers in every world and why                                                                                                                                                                                                                          |
| 3. Learning history        | **Nothing**                                                                                                                                                                                                                                                                    |
| 4. Concepts                | **Nothing shown.** `conceptsOf(pack)` in `src/engine/graph.ts` can already give each skill's objective, examples, prerequisites, how its questions are used, the mistakes they tell apart and its hint ladder. There are no difficulty settings                                |
| Skip optional worlds       | **Nothing**                                                                                                                                                                                                                                                                    |
| 5. Session management      | `WhereToBegin.tsx`: a sitting length of about 10, 15 or 20 minutes (after which Glim rests and nothing more is suggested), "a grown-up is helping", where Play begins. `DeviceSettings`: sound, motion, graphics. **No words on breaks**                                       |
| 6. Offline connection      | Things to try together exist **only on world pages**, for Inventor Island, Explorer Harbor and the Music Lab (`together` in `src/game/worlds.ts`). None for Reading Cove, Number Garden, Robot Ridge or Memory Forest. Nothing in the grown-ups' area, nothing printable       |
| 7. Data control            | Export is readable JSON with a format version and a checksum (`src/storage/transfer.ts`). Import checks type, size, shape, checksum and ownership, and merges. **It does not check that the challenges it refers to exist**                                                    |

### What was built in a session and not kept

The following was written and partly tested, then left uncommitted when work stopped. **None of it is in the
repository.** Redo it from this description. It is a reasonable design, but not a binding one.

1. **Import checks what a file refers to.** In `src/storage/transfer.ts`, add a `KnownContent` interface
   (`lesson(lessonId) → boolean`, `challenge(lessonId, challengeId) → boolean`) and an `ImportProblem` of
   `'unknown-content'`. `readBundle(input, known?)` refuses a bundle in which a sitting's `lessonId`, or an
   answer's `lessonId` or `challengeId`, is unknown, and names the first one. Pass `known` through
   `Repository.importBundle(input, known?)` and `importProfile(fileText, known?)` in `src/game/profiles.ts`. The
   storage layer must not import content, so the game supplies `known`. **Build `known` in `src/parent/`**, from
   `lessonCalled()` (`src/content/lessonList.ts`) with "a challenge id begins with its lesson id and a dot". Doing
   it in `profiles.ts` would pull the lesson list into the first load, which has no room (section 5). Test it in
   `tests/storage/repository.test.ts`: a known file loads; an unknown lesson, an unknown challenge or an unknown
   sitting is refused and nothing is written; without `known`, nothing is checked.
2. **Day by day.** Add `src/engine/history.ts` with `dayByDay(attempts) → DayDone[]`, the latest day first.
   Each `DayDone` has `day`, `lessons`, `answers`, `alone` (first tries in an independent step with no hint and no
   help: `isIndependentProbe`), `aloneRight` (`isIndependentSuccess`), `rightWithHelp` (correct with a second
   try, a hint or a grown-up) and `firstTimeAlone` (skills done alone for the first time that day). It drops
   answers whose day is not a calendar day, counts an answer stored twice once, and gives the same result in any
   order. Export it from `src/engine/index.ts` and add `history` to the `engine-next` chunk group in
   `vite.config.ts`. Show it in `src/parent/History.tsx` as one card per day, in sentences (they read on a 320 px
   phone, where a table does not), for the latest 14 days, with a line saying how many earlier days a saved copy
   holds. Write days in words with a function that works the weekday out from the day number (1970-01-01 was a
   Thursday), so the result does not depend on the browser's locale. Say nothing until the record has been read
   (`data-settled`), as `Evidence.tsx` does. Share the record-reading hook between the cards by moving `useRecord`
   from `Evidence.tsx` into `src/parent/fetched.ts`.
3. **When each skill was last practised, and when it is worth coming back to.** In each row of `Evidence.tsx`,
   add `getSkillReview(record, skill, localDay(now()), DEFAULT_REVIEW_POLICY, DEFAULT_EVIDENCE_POLICY, chance)`
   (`src/engine/review.ts`) and show "Last practised on …" and "Worth coming back to from …" (or "now"). This is
   the brief's "last review / next suggested". In the tests, a `vi.mock('@/game/services', …)` must spread the
   original module, because the code now calls `localDay` and `now`.
4. **A skill in full** (the brief's "Concepts"): a `<details>` in each skill row, closed by default, built from
   `conceptsOf(pack)`. It shows what the skill builds on (by name, never by id), the activities that ask it,
   three example instructions (an instruction is a key into `pack.strings.en`, so resolve it), how its questions
   are used, how a sitting draws them, the help it offers in words, and the mistakes it can tell apart. To have
   `useSkills()` in `fetched.ts` return `concepts` and `words` beside `skills`, it calls `conceptsOf(pack)`.
5. **Things to do together, away from the screen**, and printable: `src/parent/guides.ts` holds new guides for
   the four worlds without any (a sound hunt for Reading Cove; counting snacks for Number Garden; "be the robot"
   for Robot Ridge; "what is missing?" on a tray and a walk to remember for Memory Forest). Each has what to do,
   what is needed and what to watch out for: choking (cut grapes lengthways), stairs, roads. `allGuides()` puts
   them together with the `together` entries already in `worlds.ts`. `src/parent/Guides.tsx` lists them by world,
   with a "Print these" button that sets `data-printing="guides"` on `<html>` and calls `window.print()`, and a
   `@media print` rule that hides everything else in the area. Keep these out of `worlds.ts`, which is in the
   first load.
6. **Leave a world out of where Glim points** (the brief's "skip/enable optional worlds without false mastery").
   Add `leftOut: v.optional(v.array(WorldIdSchema))` to `ProfileSchema.settings` (`src/engine/schema.ts`) and
   `leftOut?: readonly WorldId[]` to `AdviseInput`. In `advise()`, choose `top` only from the worlds not left out;
   each world's own page keeps its Play. Pass it through `adviceEngine.ts` and `advice.ts`, putting it in the key
   the hook re-asks on. Give `nextWorld(done, leftOut)` in `src/game/progress.ts`, the map's fallback, the same
   rule. Add a `withLeftOut(settings, world, out)` helper in `src/game/placement.ts`, and a tick per world on the
   "where to begin" card ("Glim may point at …"). Nothing is closed or counted as done. This one had **no tests
   yet**. Needed: `advise` never makes a left-out world `top` and returns `null` when all are left out;
   `withLeftOut` writes nothing when nothing is left out; the hook asks again when the setting changes; the card
   saves the tick; and a browser test shows the map not pointing at a left-out world while its page still offers
   Play. The setting changes what a player record can hold, so rehearse the update.
7. **Breaks.** Add a sentence to the sitting-length help in `src/parent/text.ts`: short sittings with something
   else in between suit young children, and nothing keeps a streak, sends a reminder or asks a child to come
   back.

### What phase 13 still needs after that

- **The brief's acceptance test, as a browser test**: a new learner completes guided and independent challenges;
  the dashboard shows the right distinctions (guided against independent, counts, history); save a copy; erase;
  load it; everything shown is identical. Compare the text of the skill rows and of the history before and after.
- **Profile isolation** in the browser (one player's record, history and suggestions never shown for another),
  and **badges cannot edit the log**: tapping a status or a history card changes nothing. Status badges are `<p>`,
  not buttons; a test should hold to that.
- **Accessibility and fit of every new card**: run axe on the grown-ups' area with the new cards open
  (`e2e/a11y.spec.ts` shows how), and check that nothing runs off the side on 320, 360 and 390 px phones and on
  the phones held sideways (`screenFit` in `e2e/fixtures.ts`). The fold-outs' summaries must be at least 44 px
  tall.
- Decide whether "difficulty settings" means anything here. Nothing in the game has one; the brief lists them
  under Concepts.
- **The build budget** (section 5) has to be raised on purpose, or room made. Phase 13 will not fit otherwise.
- Documents: PROGRESS (a phase 13 table like phase 12's), ARCHITECTURE, QUALITY_REPORT (a review with pictures
  in `docs/review/phase-13/`), TEST_RESULTS, CONTINUE_HERE, README.
- The full check, the full browser suite, a rehearsal of the update, a push and a pull request.

---

## 4. Phases 14 to 17

Read each brief in `prompt-series/`. What is already there to build on:

### 14: production safety, accessibility, performance

- **Privacy:** local only. No third-party requests from the child's side (every browser test fails on a request
  to another origin). A unit test fails if any shipped file contains another site's address. A strict
  Content-Security-Policy is in `vercel.json` and checked by `scripts/verify-dist.mjs`. No microphone, no camera,
  no purchases, no sharing, no leaderboards, no streaks. **Not done:** a written privacy assessment (COPPA and
  similar), a dependency licence audit (`docs/ASSETS.md` lists assets and their licences, not every npm package),
  a security audit.
- **Accessibility:** axe (WCAG 2.1 A and AA) runs on many pages (`e2e/a11y*.spec.ts`). There are keyboard
  journeys, reduced motion, sound off, and a 56 px minimum for what a child presses (`e2e/sizes.spec.ts`). **Not
  done:** 200% text zoom on the grown-ups' area, a real screen reader, a low-stimulation option beyond reduced
  motion, a check of flashing.
- **Performance:** budgets in `scripts/verify-dist.mjs`. The 3D hub loads on demand, with quality tiers and a
  picture fallback (`npm run measure:hub`, `npm run measure:idle`). **Frame rate has only been measured on a
  software renderer, never on a real GPU or phone.** Not done: memory, long-task and interaction budgets measured
  on a device.
- Safety notes for the away-from-screen activities exist beside each one; nobody has reviewed them.

### 15: QA and release evidence

- 2724 unit tests and 1535 browser tests (Chromium on seven screen shapes locally; CI adds WebKit on five). Every
  activity is played to its end by a browser test (`e2e/everything.spec.ts`, plus the Robot Ridge and Inventor
  Island specs). Failure modes are covered in `e2e/resilience.spec.ts`, `offline.spec.ts`, `phones.spec.ts` and
  others. Content rules refuse wrong packs (`tests/content/`).
- **Not done:** perceptual screenshot comparison (screenshots in `docs/review/` are reviewed by eye, not diffed),
  Firefox, physical devices, high-contrast mode, GPU context loss, the six pedagogical journeys A–F written out
  as named tests. Most are covered piecemeal; map them.
- Visual ratings exist per phase in `docs/QUALITY_REPORT.md`, by one reviewer reading screenshots.

### 16: Vercel release

- `vercel.json` (headers, caching, SPA rewrite), `.github/workflows/ci.yml` (13 jobs), `preview-smoke.yml`,
  `docs/DEPLOYMENT.md`. A service worker pre-caches the first load (`scripts/vite/service-worker.ts`), and the
  update path is rehearsed by `npm run rehearse:update`.
- **Not done:** `docs/RELEASE_CHECKLIST.md`. Opening a preview (previews sit behind Vercel's sign-in; a share
  link is the owner's to make). **Never** promote or change anything in the Vercel project without the owner's
  explicit approval, and never claim a deployment you have not checked.

### 17: polish and hand-off

- Not started. The open items in section 7 are the honest list of what polish should look at first. No child
  playtests have been done. If any are done, they must be consented and observed, with nothing recorded or
  uploaded.

---

## 5. Budgets that are nearly spent

From `npm run verify:dist` on #17's tree:

| What                                                | Now       | Limit    |
| --------------------------------------------------- | --------- | -------- |
| First-load script (gzip)                            | 108.3 kB  | 110 kB   |
| Whole build without the voice and the content (raw) | 2844.1 kB | 2850 kB  |
| Content: seven packs and the atlas (raw)            | 716.5 kB  | 900 kB   |
| Voice: 736 clips                                    | 9350.8 kB | 10500 kB |
| 3D hub (gzip, on demand)                            | 260.1 kB  | 290 kB   |

Raising a limit is a decision: change it in `scripts/verify-dist.mjs` with the reason written beside the number.
Anything added to `src/game/worlds.ts`, `src/game/profiles.ts` or the map lands in the first load; keep grown-up
material in `src/parent/` (an on-demand chunk). The verifier also fails the build if any two built files import
each other in a ring, and with good reason: that once made the grown-ups' page fail in the built game only
(`docs/ARCHITECTURE.md`, _Bundle splitting_).

---

## 6. Working practices that kept it sound

These are not style preferences. Each one is here because breaking it once let a real fault through.

### Layers and rules

- `src/engine` is pure: no clock, no random source, no DOM. ESLint enforces it. Time, ids and seeds come from
  `src/game/services.ts`; days are passed in as `YYYY-MM-DD` strings.
- `three` and `@react-three/*` may be imported only under `src/render/hub3d`.
- Content is generated: `scripts/content/<world>.mjs` writes `src/content/packs/*.json`, and `npm run content`
  rewrites the packs, `lessons.lock.json`, `lessonList.json`, `concepts.json` and the voice lines. **A lesson
  that is live is never changed in place.** Give it a new `version`; the lock file and a test refuse a changed
  lesson without one.
- Stored shapes are valibot schemas in `src/engine/schema.ts`. A new optional key in a player's settings needs
  no migration, but rehearse the update. A changed meaning of stored data needs a new `DATA_VERSION` and a
  migration in `src/storage/migrations.ts`. Never edit a shipped migration.
- What a grown-up says (things seen, things tried away from the screen, where to begin, a story told back) is
  **never evidence**. It is stored apart and is read by nothing that reports what a child has shown.
- No sentence anywhere may say anything about a child's ability, intelligence or development. Statuses and
  thresholds are product heuristics and are labelled so.

### Tests

- **A test that passes the first time has not yet shown it can fail.** For each change, put faults back one at a
  time (break the code the test is about, run the test, see it fail, restore). Record the counts in
  `docs/TEST_RESULTS.md`. A small script that replaces one exact string in a file, runs `npx vitest run <tests>`,
  reports whether anything failed and restores the file is enough. For browser tests, rebuild after the fault and
  run the one spec with `--retries=0`.
- Measure layout only after the page has arrived: `arrived(page)` in `e2e/fixtures.ts`. For anything about
  answers that are offered in turn, use `shown(page)` (a board sets `data-shown="true"` once its step's script
  has run).
- World pages set `data-settled` once they know who is playing; wait with `worldSettled(page)`. The grown-ups'
  cards set `data-settled` when what they show is all there will be.
- A browser test about one step of an activity pins the sitting's seed (`pinSeed` and `seedThatBrings` in
  `e2e/sittings.ts`). Never play sittings until luck brings a step: that failed CI by arithmetic once.
- `SLOW_CPU=8 npx playwright test …` slows the page (Chromium only), not the test driver. A race that the test
  loses by being slow is reproduced by putting a `waitForTimeout` into a scratch copy of the spec, deleted
  afterwards.
- Every browser test fails on a console error or warning, a failed request, or a request to another origin.
- Do not rebuild `dist/` or edit specs while a Playwright run is in progress. Kill a stale `vite preview` before
  starting one; the tests start their own on port 4173.
- Vitest does not type-check: run `npm run typecheck` too. Prettier reformats code, so string-replacing scripts
  must match the file as formatted.

### Before every push

- `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build && npm run verify:dist`,
  and the browser tests the change touches on all seven screens. Run the whole suite before a phase's pull
  request.
- **Rehearse the update** whenever content or anything stored changes:
  `npm run rehearse:update -- origin/main`. It builds `main` and this tree, plays on the old one, swaps the
  server, and checks that nothing is lost. It rebuilds `dist/`. It plays a game of pairs on the live build to
  check the data-version-2 migration; give the next change to stored data the same kind of check.
- `git fetch origin main` first: if the open pull request has been merged, start the branch again from `main`.

### When CI is red, or green with a large artifact

Find the root cause. "Flake" is not a cause. Download the job's artifact into an empty directory, read
`error-context.md` and the trace, reproduce it locally (slow the processor, delay the test, hold the clock), fix
it, show the failure before and the pass after, and write it up under _Continuous integration_ in
`docs/TEST_RESULTS.md`. A job gets one re-run at most.

### After a merge

The owner merges and Vercel deploys `main`. Check that Vercel's production deployment of the merge commit is
"Ready". Run **that commit's own** browser tests against the live address, from a clean checkout of it, not from
your tree, whose tests may be ahead of the site:
`git worktree add <dir> origin/main`, link `node_modules`, then
`BASE_URL=<production address> npx playwright test`. Read CI's run on `main`. Record all three in
`docs/TEST_RESULTS.md` (_The live site_), `docs/DEPLOYMENT.md` and `docs/CONTINUE_HERE.md`.

### The voice

Lines live in the packs and in `src/voice/lines.json`, and are made with an offline speech synthesiser and checked
with a speech recogniser (`scripts/voice/README.md`). The models are not in the repository. A unit test fails if a
clip is missing, stale or heard as different words. **No person has listened to any of the 736 clips.**

---

## 7. Open items, honestly

- **Sound is unheard** (voice and music). It is the release gate the briefs name. The grown-ups' area has a list
  for listening to and marking every clip.
- **No child has played, and no teacher has reviewed the content.**
- **Not explained:** eleven times in CI, a WebKit test's first page never arrived and then arrived at once at the
  second attempt (not seen since run 54). Once, in Chromium, an activity stood at "Getting ready…" for ten
  seconds (run 56). It now says what it waits for (`data-opening`), and a failing test reports it.
- "Independent so far" can still be luck. A made-up learner who only taps is called that at something, at some
  time, in 38 made-up months of 40 (`docs/QUALITY_REPORT.md`, _Phase 12_).
- A finger that lands on the wrong thing counts as a wrong answer, so a child with unsteady hands is shown as
  knowing less than they do.
- Twenty skills have fewer than three presentations; one can never be called independent; mending a bridge can
  never be called independent by its own questions (`docs/CURRICULUM.md`).
- What a wrong answer was is recorded and not used to choose what comes next across sittings.
- A page left open over midnight goes by the day it was opened on until it is opened again.
- How long the choice of what to play next takes on a phone with a year of play is not measured: 49 ms on a desk
  for about a year's made-up answers.
- Frame rate on a real GPU or phone: never measured. Safari on a real iPhone: only the owner has opened the site.
- Phase 12's numbers (the waits, seven in ten played before, one trouble a day, the luck thresholds) were tried
  only on made-up learners.

---

## 8. A short checklist

1. Read #17's CI at its head, every job, and artifact sizes; fix what is red, explain what retried.
2. If #17 is merged: restart the branch from `main`, check the live site with that commit's tests, record it.
3. Phase 13: rebuild section 3's items with tests and fault checks; the acceptance browser test; budgets;
   documents; full suite; rehearsal; pull request.
4. Phases 14 to 17 from their briefs, in order, keeping section 6's practices.
5. Never claim what was not run. Keep every document's numbers true to the last run.
