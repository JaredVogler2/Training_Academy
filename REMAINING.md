# What remains, and how to pick it up

This file is for a coding agent (or a person) who arrives with the repository and nothing else: no memory of
the sessions that built it, no scratch files and no chat history. It says where the work stands, what is left of
the plan, and the working practices that kept the game sound. It was last brought up to date on **2026-11-27**.
Check every fact against the repository before acting on it. The code and `git log` win over this file when they
disagree.

The other documents go deeper and are kept truthful: `docs/CONTINUE_HERE.md` (hand-over, what is live, what to
look at first), `docs/PROGRESS.md` (every phase's brief set against what exists), `docs/ARCHITECTURE.md`,
`docs/CURRICULUM.md`, `docs/QUALITY_REPORT.md` (reviews, and what is still wrong), `docs/TEST_RESULTS.md`
(everything that was run), `docs/DEPLOYMENT.md`, `docs/RELEASE_CHECKLIST.md`, `docs/RELEASE_AUDIT.md`,
`docs/ASSETS.md` and `docs/ART_DIRECTION.md`. The plan is the seventeen briefs in `prompt-series/` (start with
`prompt-series/README.md` and `00_MASTER_BRIEF.md`).

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

| Phases | State                                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------- |
| 01–11  | Done or built: the foundation, the look, the journey, the voice and first-visit help, and all seven worlds     |
| 12     | **Built and live**: what Play offers next, and a record that allows for luck                                   |
| 13     | **Built, on the open pull request** (section 3). Not live until it is merged                                   |
| 14–17  | Not started as phases. A release checklist and a release audit are written; much groundwork exists (section 4) |

"Built" is meant exactly. Nobody has listened to the voice or the music, no child has played, and no teacher has
reviewed the content. The briefs call the accuracy of the audio a release gate, and that gate has not been
passed.

### Git and GitHub

- `main` is at `ccaddde`. On 2026-11-27 the owner merged pull request #17 (phase 12, as `f2c080f`) and, twelve
  minutes later, #18 (the storybook graphics and animations, from the branch `codex/storybook-graphics`, as
  `ccaddde`). Vercel's production deployment of `ccaddde` is ready. CI on `main` passed (run 65, no test at a
  second attempt); the run of `f2c080f` alone was cancelled by the second merge. **Nobody has run `ccaddde`'s own
  browser tests against the live address yet** (section 6, _After a merge_).
- The working branch is `claude/zealous-carson-qyiipa`. Its open pull request carries **phase 13**: it began as
  pull request #19, a draft from the branch `codex/academy-release-readiness`, whose CI (run 66) failed in five
  jobs; this branch holds #19's commit and the fixes on top of it. If it is merged, GitHub marks #19 merged too.
- Merging is the owner's decision, and it is a release: Vercel deploys `main` to production. The owner has merged
  every pull request so far soon after its checks went green.
- The workflow cancels a run when a newer commit arrives on the same branch (`concurrency: cancel-in-progress`):
  after a push, the run on the newest commit is the one to read.

---

## 2. First steps for whoever picks this up

1. `npm ci`, then `npm run verify:release` (format, lint, types, unit tests, build, build checks, browser tests).
   Browser tests need Playwright's Chromium; the README says how to install it. WebKit runs only in CI. The full
   browser suite takes about an hour on four cores.
2. **Check the live site** with `ccaddde`'s own browser tests (section 6, _After a merge_), and record it.
3. **Read the open pull request's CI**, every job, at its head. If any is red, find the root cause and fix it
   (section 6). Never skip, disable or quarantine a test to get green. **Look at the artifact sizes even when CI
   is green**: a report of 0.5–0.9 MB has nothing in it but the summary; one of several MB means some test passed
   only at a second attempt. Download it, read the failure and the trace, and find out why.
4. If that pull request has been merged, start the branch again from the latest `main`, check the live site again,
   and record it. Then carry on with section 4.

---

## 3. Phase 13: the grown-ups' dashboard

Brief: `prompt-series/13_PARENT_DASHBOARD.md`. `docs/PROGRESS.md` → _Phase 13_ sets it against the code, item by
item. In short, the grown-ups' area (`src/parent/`) now has: a learning history (a card a day, the latest
fourteen); for each skill, when it was last practised and when it is worth coming back to, and "About this skill"
(what it builds on, where it is asked, examples, how its questions are used, the help it offers); "Worlds Glim
suggests" (a world left out is never pointed at, and is still there to play); printable things to do together away
from the screen for every world; "Use quieter settings"; and a loaded copy checked against every activity and
question it names. The licences of what the game bundles are shipped with it (`/assets/dependency-licenses.txt`,
made by the build, and `public/assets/additional-licenses.txt`).

What #19 got wrong, and this branch put right (`docs/TEST_RESULTS.md` → _Phase 13_):

- The licence notice named three other sites and was not in the asset manifest (two unit tests failed).
- Inventor Island's things to try together had lost their safety sentences (a browser test failed in four jobs).
- A loaded copy was refused if it held an answer to a question that a lesson's newer version had dropped: a
  family's own copy, saved before an update, could never be loaded again. A question of an earlier version is now
  checked as far as it can be, and a copy from a newer game is refused with a word on how to update.
- "About this skill" linked each activity, and an activity opened from the grown-ups' area is played as the child.
- The history card said "0 of 0 first tries", and said a saved copy "also holds" days whether or not one had been
  saved. The documents said phases 14 to 17 were done or audited, and that the guides had been reviewed.
- A test of touches in `e2e/phones.spec.ts` could not tell whether a press had been taken.

What phase 13 still lacks:

- **Difficulty settings.** The brief lists them under Concepts; nothing in the game has one. Decide whether it
  means anything here.
- **A person's review** of everything the area says, the guides above all (their safety notes), and any use by a
  parent.
- The history names how many skills were done alone for the first time on a day, not which.
- The new cards' words are written in the components, not in `src/parent/text.ts` with the rest.

---

## 4. Phases 14 to 17

Read each brief in `prompt-series/`. What is already there to build on:

### 14: production safety, accessibility, performance

- **Privacy:** local only. No third-party requests from the child's side (every browser test fails on a request
  to another origin). A unit test fails if any shipped file in `src/` or `public/` contains another site's address.
  A strict Content-Security-Policy is in `vercel.json` and checked by `scripts/verify-dist.mjs`. No microphone, no
  camera, no purchases, no sharing, no leaderboards, no streaks. `docs/RELEASE_AUDIT.md` writes out what data goes
  where, and `npm audit` found nothing on 2026-11-27. **Not done:** a privacy assessment by someone who can make
  one (COPPA and similar), a security audit.
- **Accessibility:** axe (WCAG 2.1 A and AA) runs on many pages (`e2e/a11y*.spec.ts`), and on the grown-ups' area at
  twice the text size. There are keyboard journeys, reduced motion, sound off, "Use quieter settings", and a 56 px
  minimum for what a child presses (`e2e/sizes.spec.ts`). **Not done:** a real screen reader, a check of flashing.
- **Performance:** budgets in `scripts/verify-dist.mjs`. The 3D hub loads on demand, with quality tiers and a
  picture fallback (`npm run measure:hub`, `npm run measure:idle`). **Frame rate has only been measured on a
  software renderer, never on a real GPU or phone.** Not done: memory, long-task and interaction budgets measured
  on a device.

### 15: QA and release evidence

- Unit tests (Vitest) and browser tests (Playwright: Chromium on seven screen shapes locally; CI adds WebKit on
  five); `docs/TEST_RESULTS.md` has the counts of the last run. Every activity is played to its end by a browser
  test (`e2e/everything.spec.ts`, plus the Robot Ridge and Inventor Island specs). Failure modes are covered in
  `e2e/resilience.spec.ts`, `offline.spec.ts`, `phones.spec.ts` and others. Content rules refuse wrong packs
  (`tests/content/`).
- **Not done:** perceptual screenshot comparison (screenshots in `docs/review/` are reviewed by eye, not diffed),
  Firefox, physical devices, high-contrast mode, GPU context loss, the six pedagogical journeys A–F written out as
  named tests. Most are covered piecemeal; map them.

### 16: Vercel release

- `vercel.json` (headers, caching, SPA rewrite), `.github/workflows/ci.yml` (13 jobs), `preview-smoke.yml`,
  `docs/DEPLOYMENT.md`, and `docs/RELEASE_CHECKLIST.md` (before a release, verifying it, rolling back). A service
  worker pre-caches the first load (`scripts/vite/service-worker.ts`), and the update path is rehearsed by
  `npm run rehearse:update`.
- **Never** promote or change anything in the Vercel project without the owner's explicit approval, and never
  claim a deployment you have not checked. Previews sit behind Vercel's sign-in; a share link is the owner's to make.

### 17: polish and hand-off

- Not started. Section 7 is the honest list of what polish should look at first. No child playtests have been
  done. If any are done, they must be consented and observed, with nothing recorded or uploaded.

---

## 5. Budgets that are nearly spent

From `npm run verify:dist` on this branch:

| What                                                        | Now       | Limit    |
| ----------------------------------------------------------- | --------- | -------- |
| First-load script (gzip)                                    | 109.1 kB  | 110 kB   |
| The game without the voice, the content and licence notices | 2857 kB   | 2870 kB  |
| Licence notices                                             | 21.9 kB   | 128 kB   |
| Content: seven packs and the atlas (raw)                    | 716.5 kB  | 900 kB   |
| Voice: 736 clips                                            | 9350.8 kB | 10500 kB |
| 3D hub (gzip, on demand)                                    | 260.2 kB  | 290 kB   |

**The first load has 0.9 kB left.** Raising a limit is a decision: change it in `scripts/verify-dist.mjs` with the
reason written beside the number. Anything added to `src/game/worlds.ts` (the things to try together are in it),
`src/game/profiles.ts` or the map lands in the first load; keep grown-up material in `src/parent/` (an on-demand
chunk). The verifier also fails the build if any two built files import each other in a ring, and with good
reason: that once made the grown-ups' page fail in the built game only (`docs/ARCHITECTURE.md`, _Bundle splitting_).

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
  lesson without one. Keep every question id beginning with its lesson's id and a dot: a loaded copy's answers to
  an earlier version are checked by that alone.
- Stored shapes are valibot schemas in `src/engine/schema.ts`. A new optional key in a player's settings needs
  no migration, but rehearse the update. A changed meaning of stored data needs a new `DATA_VERSION` and a
  migration in `src/storage/migrations.ts`. Never edit a shipped migration.
- What a grown-up says (things seen, things tried away from the screen, where to begin, a story told back) is
  **never evidence**. It is stored apart and is read by nothing that reports what a child has shown. Nothing in
  the grown-ups' area opens an activity: it would be played as the child.
- No sentence anywhere may say anything about a child's ability, intelligence or development. Statuses and
  thresholds are product heuristics and are labelled so.
- Nothing the game ships names another site, licence notices included.

### Tests

- **A test that passes the first time has not yet shown it can fail.** For each change, put faults back one at a
  time (break the code the test is about, run the test, see it fail, restore). Record the counts in
  `docs/TEST_RESULTS.md`. A small script that replaces one exact string in a file, runs `npx vitest run <tests>`,
  reports whether anything failed and restores the file is enough. Make each fault compile, or the type check is
  what catches it. For browser tests, rebuild after the fault and run the one spec with `--retries=0`.
- Measure layout only after the page has arrived: `arrived(page)` in `e2e/fixtures.ts`. For anything about
  answers that are offered in turn, use `shown(page)` (a board sets `data-shown="true"` once its step's script
  has run). Raw touches sent through the browser's own protocol do not wait for anything: wait for `shown(page)`
  first, and check after a press that it was taken.
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
`docs/TEST_RESULTS.md`. Where the cause cannot be found, say so there, and make the test say exactly where it
failed next time. A job gets one re-run at most.

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
- **No child has played, and no teacher has reviewed the content.** Nobody has reviewed the safety notes of the
  things to do away from the screen.
- **Not explained:** eleven times in CI, a WebKit test's first page never arrived and then arrived at once at the
  second attempt (not seen since run 54). Once, in Chromium, an activity stood at "Getting ready…" for ten
  seconds (run 56). Once, in run 66, a press of "My turn" sent as raw touches was not taken; 22 runs on a slowed
  page did not bring it back.
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

1. Check the live site with `ccaddde`'s own tests, and record it.
2. Read the open pull request's CI at its head, every job, and the artifact sizes; fix what is red, explain what
   retried.
3. When it is merged: restart the branch from `main`, check the live site with that commit's tests, record it.
4. Phases 14 to 17 from their briefs, in order, keeping section 6's practices; `docs/RELEASE_CHECKLIST.md` for any
   release.
5. Never claim what was not run. Keep every document's numbers true to the last run.
