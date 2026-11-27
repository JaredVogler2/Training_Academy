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

> Current branch handoff. Phase 12 and the storybook graphics were merged and deployed before this work began. For the dashboard and release evidence, see [Release audit](docs/RELEASE_AUDIT.md) and [Release checklist](docs/RELEASE_CHECKLIST.md). The original production notes below describe the date this handoff was first written.

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
| 12     | **Built and deployed from main**                                                                           |
| 13     | **Implemented on the release-readiness branch**                                                            |
| 14–17  | Release audit and checklist added. Human and physical verification remains                                 |

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

## 2. First steps

Start from `main` and read the [release checklist](docs/RELEASE_CHECKLIST.md). Verify the exact Git SHA when checking a preview or production deployment.

## 3. Phase 13: the parent dashboard

The release-readiness branch adds daily learning history, last-practised and review dates, expandable curriculum details, printable activities for all seven worlds, and per-player controls for where Glim points. The worlds and their activities remain directly available. The backup importer checks lesson and question references in actual published packs before writing.

The remaining checks for release are listed in the [release checklist](docs/RELEASE_CHECKLIST.md). That includes human audio and educator review, and physical-device and screen-reader checks. The underlying learning policies and their limitations are covered in the [Quality report](docs/QUALITY_REPORT.md).

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

- The release-readiness branch adds a checklist and audit. Section 7 records the open product and validation issues. No child
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

The release-readiness branch sets the runtime output cap to 2,870 KiB for Phase 13 and keeps the 110 KiB first-load JavaScript cap. Code and font notices have a separate budget and are loaded on request. Raising a limit is a decision: change it in `scripts/verify-dist.mjs` with the reason written beside the number.
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

## 8. Closeout

Use the [release checklist](docs/RELEASE_CHECKLIST.md) to record the candidate, test evidence, human reviews, and approval. Confirm what reached production after an approved release.
