# Test results

Everything in this file was actually run. Where something was not run, it says so.

- **Date:** 2026-11-25
- **Code under test:** `main` as the owner merged it on 2026-11-23 (pull request #6, the six worlds), with the
  fixes of the pull request this document came with: five faults found after the six worlds went live, and what
  the tests learned from them. The release check below was run on that tree. What was run on the live site was
  run on what was live, and says so.
- **Locally:** a Linux container (Ubuntu 24.04, 4 CPU cores, **no GPU**), Node 22.23.5, npm 10.9.9, Playwright 1.63.0
  with its Chromium 157 (headless; WebGL through the SwiftShader software renderer). WebKit is not installed there.
- **In CI:** GitHub Actions, `ubuntu-latest`, Node 22, the Chromium and WebKit builds that Playwright 1.63.0 installs.
- **On a phone or a tablet:** not by this project's testing. See _Phones and tablets_ below.
- **On the live site:** the smoke tests, and two small probes. See _The live site_ below.

## The release check

One command runs all of it, stopping at the first failure:

```bash
npm run verify:release
```

Result of the last local run: **passed.**

| Step                   | Result                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm run format:check` | clean                                                                                                           |
| `npm run lint`         | no errors, no warnings                                                                                          |
| `npm run typecheck`    | no errors (TypeScript strict, plus `noUncheckedIndexedAccess`)                                                  |
| `npm test`             | **1392 tests in 49 files, all passed**                                                                          |
| `npm run build`        | built; 476 files in `dist/`, 395 of them the voice's recordings                                                 |
| `npm run verify:dist`  | **1066 checks, all passed** (sizes below)                                                                       |
| `npm run test:e2e`     | **668 browser tests: 621 passed, 47 skipped by design, 0 failed (Chromium, seven screen shapes, 26.6 minutes)** |

That run was of the tree this document is committed with. It has 12 browser tests (six, on the desktop and on the
phone) and 17 unit tests that the six worlds did not have. Each of the browser tests was run against the code as
it was and failed there; so were the three unit tests about a page that is the first thing opened. The other unit
tests are of things that are new, and had nothing older to fail against. _What was found after the six worlds
went live_, below, says what each is for.

It also takes longer than it did, and that is a finding more than a cost. In the games that show something
first, playing an activity to its end takes several times as long: "How many, at a glance" 34 seconds where it
took 4, "The same order" 46 where it took 11. The test knows the answers and used to tap them before the look
or the order had been given. The last commit of pull request #6 stopped that for a look, and this one stops it
for an order; a child could do the same, and no longer can. The slowest, Memory Forest's "What was where?",
takes 66 seconds of the 150 it is allowed, here and in CI.

The skipped tests are keyboard journeys, which run on the desktop project and are skipped on the touch ones; the
activities played to their ends, which are played once, on the desktop project; and three about a world that is not
open, which skip themselves now that every world is.

Phase 01 ended with 420 unit tests and 140 browser tests; Phase 02 with 594 and 177; Phase 03 with 774 and 239;
the six worlds with 1375 and 656.
No test was removed for the six worlds. Those of Phase 03's that assumed one open world were changed to say what
they mean: a test about the first activity's skill asks the grown-ups' list for that skill by name, where it used
to take the first in the list; a new child's journey follows whichever island Glim points at; and "Play" is
looked for by its exact name, now that an activity can be called "Play it back".

### What the six worlds added to the tests, and what the tests found

- **Every rule that can refuse a challenge is shown to fire.** For each world there is a table of ways to break a
  copy of the real pack, one for each rule, and a test that reads the rules' source and fails if a rule has no
  such case (`tests/content/*Rules.test.ts`).
- **Every pack is what its generator writes** (`tests/content/generated.test.ts`), and every line that can be said
  has a recording that the manifest knows and a recogniser heard as written (`tests/config/voice.test.ts`).
- **Every activity is played to its end in a browser**, by the answers its content says are right
  (`e2e/everything.spec.ts`), or, for Robot Ridge and Inventor Island, by working out what to do from what is on
  the screen (`e2e/robot.spec.ts`, `e2e/inventor.spec.ts`). A test fails if an activity is played by neither.
- **Every world's page and every activity passes axe-core's WCAG 2.1 A and AA rules**, while it is shown and
  while it is asked (`e2e/a11y-worlds.spec.ts` and the two worlds' own specs), and every world's page does held
  sideways. That last check fails on the code as it was: the line under a world's name was too pale at the size
  it shrinks to there, on five of the six pages.
- **New tests were shown able to fail.** Each batch was run against the code with the thing it checks broken on
  purpose — a map's places put in the wrong spot, a story's pictures never lifted, a missing picture left in the
  page, a glanced group uncovered again — and failed there before it was trusted.
- **What an earlier full run found**: nine tests of Phase 03's read "the first skill in the grown-ups' list",
  which is no longer Number Garden's once other worlds have skills. They now ask for it by name.

### What was found after the six worlds went live

Five faults in the game, none of them found by the 656 browser tests the six worlds were merged with. Two ways of
looking found them: an update rehearsed in a browser that already had the game (_An update, rehearsed_, below),
and a green CI run read for the tests that had needed a second attempt (_Continuous integration_, below).

| Fault                                                                                                                                                                                                                                                                                                                                                                                                                                               | How it was found                                                                                                                                                                                                                                       | The tests that fail on the code as it was                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One tap on Glim took the first showing away from every later step of an activity.** Asking to be told again was remembered by the board, which stays on the screen from step to step; every later step was taken for a second telling, and a second telling leaves the showing out. A group to glance at stayed covered, things to remember were not shown, an order was never lit, a pattern of sounds never played — and the question was asked | A tap dropped in CI (the third row) led to the code that decides when a showing is left out. A probe then played "How many, at a glance" twice: left alone, every step uncovers its group; with one tap on Glim in the second step, no later step does | `garden.spec.ts` "asking to be told again in one step takes nothing from the next"; `memory.spec.ts` "asking to be told again takes no order away…"; `tests/game/again.test.tsx` |
| **A tap on Glim before a look or an order was over took it away for that step**: while the words were being said, or in the middle of it                                                                                                                                                                                                                                                                                                            | Reading the same code                                                                                                                                                                                                                                  | `garden.spec.ts` "asked to be told again before the look is over, starts over with the look still to come"; the same test in `memory.spec.ts`                                    |
| **An order being shown could be tapped**, in the pause after each light (130 milliseconds) and before the first, while the words were still being said. A tap there was the start of an answer                                                                                                                                                                                                                                                      | CI: as a desktop in WebKit, "shows the order to everyone" waited for "Not that order" and the words never changed. Its three taps had always gone in between the lights; that time one arrived as the next light came on                               | `memory.spec.ts` "takes no tap until the whole order has been shown"                                                                                                             |
| **A world's page opened by its own address showed nothing as finished**, and Play went back to the first activity. The page never asked who was playing; the map had always asked before it                                                                                                                                                                                                                                                         | The update rehearsal: 16 of its 18 checks passed                                                                                                                                                                                                       | `garden.spec.ts` "knows what has been finished when its page is opened by its own address"; `tests/game/progress.test.tsx`; the rehearsal                                        |
| **The button to take one back was a different button** each time the giving board began or ended a count: made afresh, so that the counting would start from the first thing                                                                                                                                                                                                                                                                        | CI: as an iPad, a test asked for the button's size at that instant and was told it had none. A probe then counted three different buttons in six seconds                                                                                               | `garden.spec.ts` "keeps the button to take one back where it is while it counts"                                                                                                 |

Each browser test named there was run against the code as it was, failed there, and passes now; so were the unit
tests of what has been finished, and the rehearsal. `again.test.tsx` tests the new way of keeping an asking,
and there was no older way it could be run against.

Four of them hold the page's clock (`holdClock` and `watchFor` in `e2e/fixtures.ts`), so that "before the look"
and "between two lights" are places a test stands in, not moments it has to be quick enough to catch. A test
that has to be quick passes for a month and then fails in CI, which is how the third of these was found.

## Continuous integration

Every push to a pull request, and to `main`, runs five jobs (`.github/workflows/ci.yml`): lint, types, unit tests
and build; the browser tests in Chromium on seven screen shapes, shared between two jobs; and the browser tests in
WebKit on five, likewise. The machine they run on has four processor cores and no graphics card, and runs two
tests at a time. (Until the six worlds there was one job for each engine. With twice the tests, one Chromium job
would have run close to its forty-minute limit, so each engine's screens are now split between a job for the
desktop and tablets and a job for phones.)

**For the six worlds.** Pull request #5, which carried the engine for every kind of game, the voice and Number
Garden's seven activities, passed on its head commit `9cb3dda` (run 26; the run on the commit before it was
cancelled by that push), and again on `main` after the owner merged it as `334e0e8` (run 27): lint, types, unit
tests and build in one minute; Chromium in twenty-one; WebKit in eleven.

Pull request #6, with the other five worlds, passed on its first commit, `52d85b5` (run 28), in all five jobs:

| Job                            | Result                                                             | Time for the tests |
| ------------------------------ | ------------------------------------------------------------------ | ------------------ |
| Lint, types, unit tests, build | passed                                                             | 1.5 minutes in all |
| Chromium, desktop and tablets  | 330 passed, 9 skipped                                              | 24.6 minutes       |
| Chromium, phones               | passed                                                             | about 20 minutes   |
| WebKit, desktop and tablet     | passed                                                             | about 14 minutes   |
| WebKit, phones                 | 262 passed, 52 skipped, **1 of them passed at its second attempt** | 17.2 minutes       |

This was the first time any of the new boards had run in Safari's engine, and all of them passed there.

**The test that needed a second attempt had a cause, and the cause was in the game.** As an iPhone held
sideways, Memory Forest's "who had what?" test tapped a wrong choice and then waited ten seconds for "That was
not this one's", which never came. The tap had been ignored: it fell in the moment before the pairs were
uncovered for their look, just as the choices were being turned away. But that moment should not have had
choices in it at all. Before the look, the board showed the cover, the choices, and even the picture the
question would be about, and a tap there a little earlier would have been taken as an answer to something not yet
shown. With the voice on, that moment is the three seconds in which "Look who has what" is being said. The
board now turns the choices away from the moment the question arrives until the look has happened, and holds
back what will be asked; `e2e/memory.spec.ts` has a test for it that fails on the code as it was, and the test
that tripped now waits for the look before it goes on. The run on that commit, `4f54a8c` (run 29), passed in
all five jobs with no test needing a second attempt.

**On `main`, after the owner merged it** as `0e836eb` (run 30, 2026-11-23): all five jobs passed.

| Job                            | Result                                                     | Time for the tests |
| ------------------------------ | ---------------------------------------------------------- | ------------------ |
| Lint, types, unit tests, build | passed                                                     | 1.3 minutes in all |
| Chromium, desktop and tablets  | 331 passed, 9 skipped                                      | 26.7 minutes       |
| Chromium, phones               | 278 passed, 38 skipped                                     | 18.7 minutes       |
| WebKit, desktop and tablet     | 223 passed, 53 skipped, **4 more at their second attempt** | 13.9 minutes       |
| WebKit, phones                 | 264 passed, 52 skipped                                     | 20.1 minutes       |

It was the same code as run 29. A green run with four tests retried in one job was read test by test, and none
of the four was put down to chance before it had been looked at.

1. **As a desktop, "shows the order to everyone, and again only as help"** waited ten seconds for "Not that
   order. Watch again." while the screen still said "Watch the order. Then tap them the same way." **The cause
   was in the game**: an order being shown could be tapped in its pauses, and that is where the test's taps had
   always gone. It is the third fault in the table above, and reading its code found the first two.
2. **As an iPad, "is played by giving, taking back and saying when it is done"** found the button to take one
   back 0 pixels high, two and a half seconds in. **The cause was in the game**: the button was replaced by a
   new one as the board began to count. The fifth fault above. The test was not wrong to ask.
3. **As a desktop, "the way is marked instead of walked…"** was failed for an uncaught error:
   `/127.0.0.1:4173/immutable/rr.steps.correct-BoltnQ2G.mp3 due to access control checks.` **The cause was the
   tests' reading of WebKit.** The test goes to another activity the moment "Yes. Your steps took the robot to
   the star" appears, while that line's recording is still arriving. WebKit cancels the download and says so
   twice: as a cancelled request, which the tests have always let pass when the page had moved on, and in
   words on the console, "Fetch API cannot load … due to access control checks", which Playwright's WebKit side
   hands on as an uncaught error, having taken the text up to the first colon for the error's name (read in
   Playwright's source). The second report is now judged by the same rule as the first: it passes only if the
   download it names began before the page moved on (`fetchNotLoaded` in `e2e/diagnosis.ts`, tested with CI's
   own text).
4. **As an iPad, a page that never came.** "The page does not bounce, reload when pulled down, or zoom on two
   quick taps" asked for the home page at its first line and waited the whole minute; at its second attempt
   the page came in two seconds. This is the third time (the first two are under Phase 03, below), and the
   first since tests began to say what they were waiting for: "the last page asked for had not been read yet; 1
   unanswered: document / (asked for 60.0 s before)". So it was the page itself, asked for and never answered.
   In that same minute the other worker's tests loaded pages from the same server as usual. By the order of the
   log, the test that had its browser before it was Memory Forest's order game, which had passed. **Not explained.** What was added is
   the server's side: the preview server notes each page as it is asked for and again when it has answered,
   and a test that runs out of time waiting for a page reads the notes and says whether its request arrived,
   and which test had its browser before. Tried here with a page made never to come: "…1 unanswered: document
   /never (asked for 10.9 s before; no request for /never reached the server after that); the test that had the
   browser before this one: [desktop] the one before".

On `main` the Chromium job for the desktop and tablets took 26.7 of the 40 minutes it is allowed. The fixes
above add about two more, because an activity that shows something first can no longer be answered early.

**Phase 03** is pull request [#4](https://github.com/JaredVogler2/Training_Academy/pull/4). The first run with
the whole phase in it to pass was [3](https://github.com/JaredVogler2/Training_Academy/actions/runs/45093042202)
below, on `d2e644c`: **all three jobs passed, with no failed test and no retry.**

| Job                            | Result                                                      |
| ------------------------------ | ----------------------------------------------------------- |
| Lint, types, unit tests, build | passed                                                      |
| Browser tests, Chromium        | 219 tests: 215 passed, 4 skipped by design, in 13.0 minutes |
| Browser tests, WebKit          | 201 tests: 172 passed, 29 skipped, in 6.6 minutes           |

Chromium's seven screens are the five of Phase 02 and a Pixel 7 upright and sideways. WebKit's five are a desktop,
a phone, and an iPhone 13 upright and sideways and an iPad. WebKit's 29 skipped tests are the 26 of Phase 02 (what
needs the 3D scene or the service worker, and the keyboard journeys on touch) and the one 3D test among the layout
tests on each of the three Apple profiles.

The documents were then committed (`8a0ef1d`, run 4: all three jobs passed), and after them the second look at
phones, in two commits. [Run 5](https://github.com/JaredVogler2/Training_Academy/actions/runs/45099584115) is on the first of them, `66b4378`: **all three jobs passed.** Chromium:
239 tests, 235 passed and 4 skipped by design, in 12.3 minutes, with no retry. WebKit: 217 tests, 185 passed,
one more at its second attempt, and 31 skipped, in 7.3 minutes. The one is the page load described below. The
31 are the 29 above and the two-finger test on WebKit's two plain projects, which needs Chromium's touch
handling. So the notch, the flat screens and the single row of islands pass in WebKit as well, as an iPhone 13
and as an iPad.

The second commit, `595e718`, answers a slow press, fits the end of an activity on the flattest screens, and makes
a test that runs out of time say what it was waiting for. Its run, and the run on these documents, are on the
pull request: they could not be written down here before they had happened.

It took three runs to the first of those, and the second failed:

| Run                                                                            | Commit    | Chromium                            | WebKit                                                                | What it showed                                                                                              |
| ------------------------------------------------------------------------------ | --------- | ----------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [1](https://github.com/JaredVogler2/Training_Academy/actions/runs/45090363033) | `c2305ed` | stopped by the next push            | 168 passed, 29 skipped, 6.2 minutes                                   | The journeys and every layout test pass in WebKit as an iPhone 13 and as an iPad, at the first attempt.     |
| [2](https://github.com/JaredVogler2/Training_Academy/actions/runs/45091891951) | `d6297eb` | stopped by the next push            | **1 failed, 2 passed at the second attempt**; 169 passed, 29 skipped  | Three things, below.                                                                                        |
| [3](https://github.com/JaredVogler2/Training_Academy/actions/runs/45093042202) | `d2e644c` | 215 passed, 4 skipped, 13.0 minutes | 172 passed, 29 skipped, 6.6 minutes                                   | The two faults in the tests put right. No failure, no retry.                                                |
| [4](https://github.com/JaredVogler2/Training_Academy/actions/runs/45095038769) | `8a0ef1d` | passed (the job took 15.3 minutes)  | passed (the job took 7.3 minutes)                                     | Documents only.                                                                                             |
| [5](https://github.com/JaredVogler2/Training_Academy/actions/runs/45099584115) | `66b4378` | 235 passed, 4 skipped, 12.3 minutes | 185 passed, **1 more at its second attempt**, 31 skipped, 7.3 minutes | The second look at phones passes in both browsers. The page load that waits a minute happened again: below. |

What run 2 showed, all as an iPhone:

- **A test compared a size with 64 exactly.** The guide's tap area is 64 pixels high; read back from WebKit at
  three device pixels to one it was 63.99997 (in run 1 the same reading had come back a hair the other side). Sizes
  read back from a browser are now compared to half a pixel. The area's real size is fixed by the layout arithmetic
  and its unit tests.
- **A test clicked by force to show that nothing behind the pause sheet can be tapped.** On that screen, with that
  order of the choices, the click landed on "carry on", which is in front of it, and closed the sheet. It passed
  at its second attempt because the order was different. The test now asks the browser what is at each choice's
  middle.
- **Not explained:** held sideways, one test waited 60 seconds for the home page to load and then passed at its
  second attempt in 3.6. It came straight after the two failures above had restarted the browser three times.
  **It has happened once more since**, in run 5: as the plain WebKit phone, a different test waited 60 seconds
  for the activity's page at its very first line, with nothing having failed before it, and passed at its
  second attempt. Twice in five runs, both times in WebKit; never in Chromium, and never on the machine this was
  written on, where WebKit cannot be run. What CI keeps of a failed attempt is a picture, with no record of the
  network, and it cannot be fetched from here in any case. So the tests now say it themselves: one that runs out
  of time reports how far the page had got and every request that had not been answered (`e2e/fixtures.ts`).
  The next time, the log will say whether the page never arrived or one of its files did not.
  **And the next time came**, on `main` after the six worlds: it was the page itself that never arrived. See
  run 30, above, for what the log said and what was added to it.

The times still say what they said in Phase 02 (below): the slowest test was a 3D one at 56 seconds of its three
minutes, and a test that came after a 3D test — this time one of the new journeys — took 32 of its 60.

**Phase 02** was pull request [#2](https://github.com/JaredVogler2/Training_Academy/pull/2), merged as `65a137b`.
Every run passed all three jobs, with no failed test and no retry:

| Run                                                                            | Commit               | Chromium                                     | WebKit                              | What it showed                                                                                                                                                                                              |
| ------------------------------------------------------------------------------ | -------------------- | -------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [1](https://github.com/JaredVogler2/Training_Academy/actions/runs/45073413722) | `107acd6`            | 173 passed, 4 skipped by design, 7.8 minutes | 118 passed, 26 skipped, 3.9 minutes | Green, and one test close to its limit: "keeps moving gently" took 46.8 of its 60 seconds on the desktop screen.                                                                                            |
| [2](https://github.com/JaredVogler2/Training_Academy/actions/runs/45075801660) | `8899c8c`            | the same, 10.9 minutes                       | the same, 4.1 minutes               | A trial: the hub's tests one after another (taken out again in run 3; see below for what it did and did not show), and three minutes for the tests of the 3D scene (kept). That test took about 77 seconds. |
| [3](https://github.com/JaredVogler2/Training_Academy/actions/runs/45078542501) | `1102729`            | the same, 9.2 minutes                        | the same, 4.1 minutes               | The order as it was before, the three minutes kept. That test took 59.8 seconds: 0.2 inside the limit it had before.                                                                                        |
| [4](https://github.com/JaredVogler2/Training_Academy/actions/runs/45079897889) | `65a137b`, on `main` | the same, 11.7 minutes                       | the same, 3.5 minutes               | The merge: the same code and order as run 3. That test took about 78 seconds, which the limit it had before would not have allowed.                                                                         |

WebKit's 26 skipped tests are, on each of its two projects, the eight that need the 3D scene and the three that need
the service worker (see _iOS Safari_ below), and on its touch project the four keyboard journeys. None of its
tests has taken more than 12 seconds.

### What the times in those runs said

Nothing failed, so nothing asked to be looked at. The times were read anyway, and they said three things.

**The tests of the 3D scene had less time than their own steps were allowed.** Each waits up to 45 or 60 seconds for
the scene to arrive and then photographs it, inside a test that had 60 seconds in all. Drawn in software on the CI
machine, "keeps moving gently" took 46.8 seconds in run 1, 59.8 in run 3 and about 78 in run 4, in the same order
each time; in run 4 another of them took 58.2. Those tests have been allowed three minutes since run 2
(`SOFTWARE_3D_TIMEOUT` in `e2e/hub.spec.ts`), and without that run 4, on `main`, would have had a test run out of
time. No assertion was changed and no test was skipped.

**On that machine, a test pays for the 3D test before it.** A test that ends with the scene still moving leaves the
next test in the same browser late by five to thirty seconds, most after the highest tier. In run 1, "falls back to
the picture if the 3D code cannot be downloaded" took 17.3 seconds on the desktop screen, straight after a 3D test,
and 1.5 on the phone screen, where the test before it had ended with the picture. The lesson test that happens to
follow the highest tier's scene took 35.3 of its 60 seconds in run 3 and 44.5 in run 4; it takes about 10 otherwise.
This is read off the times, not traced; the likely cause is the one under _Seen only on the CI machine_ below, with
far more work queued. It does not happen at all on the machine this was developed on.

It has not failed a test, but 44.5 of 60 is closer than it should be. If that test ever does run out of time, CI
runs it once more in a fresh browser, where there is nothing to wait for, so it would show as a retry and not as a
failure. It has not been fixed: the tests that have a minute were left alone here, and it is listed in
`docs/PROGRESS.md` → _Known gaps_. An untried idea: have each 3D test open one more page before it ends, so that it
pays for its own clearing up out of its three minutes.

**That machine's own speed varies more than anything else measured here.** Runs 3 and 4 are the same code in the
same order, a quarter of an hour apart: 9.2 and 11.7 minutes. Run 1, in that order too, took 7.8.

So run 2 settled nothing, and what was first concluded from it was wrong. It tried the hub's tests one after
another, so that no two scenes were drawn at once. Locally that made the 3D tests quicker (the first of them took 13
seconds instead of 23). In CI the run took 10.9 minutes, which looked like a loss beside the 7.8 before it, and the
trial was taken out on that reading: the message of commit `1102729` says it made CI slower. Run 4 then took longer
without it. One run each way cannot tell on a machine that varies this much. The order stays as it was because,
with three minutes allowed, nothing needs it to change; whether the other order would be better is not known.

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

## What the unit tests cover (Vitest, 1392)

| Area                                                              | Files                                                                                                                                                   | What is proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine                                                            | `tests/engine/*` (3)                                                                                                                                    | Seeded randomness is stable; a sitting is planned, resumed and finished deterministically; wrong answers, hints, reveals, re-probes and double submissions behave as specified; a property test plays lessons with arbitrary taps and they always end; evidence rules, including "watching, hints and second tries never count" and "one success per challenge per day"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Content                                                           | `tests/content/packs.test.ts`                                                                                                                           | The shipped pack passes the schema and every lint rule; every lint rule is shown to fire on a deliberately broken copy; a test fails if a rule is added without such a case                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Storage                                                           | `tests/storage/*` (4)                                                                                                                                   | One contract suite against IndexedDB (fake-indexeddb), localStorage and memory drivers; atomic batches; insert-only attempts; migrations including an interrupted one and data from a newer version; export/import round trip, damage, wrong owner, idempotent merge; fallbacks when storage is refused                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Game                                                              | `tests/game/*` (2)                                                                                                                                      | The lesson runner saves, resumes, survives a failed save and a second tab; the counting pictures never overlap or leave their box for 1–10 things                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Shell                                                             | `tests/app/*` (6), `tests/parent/*` (1)                                                                                                                 | Router parsing and addresses; settings and their fallbacks; audio unlock, mute and unavailable audio; quality-tier choice; diagnostics; control components; the wording of evidence shown to grown-ups                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Build and server                                                  | `tests/config/*` (2)                                                                                                                                    | `vercel.json` as compiled by Vercel's own route compiler: rewrites, 404s, headers, cache rules; the service worker's policy against a fake Cache API, including the `Vary` case found in a real browser                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Layout of the hub** (Phase 02, and the second look of Phase 03) | `tests/render/archipelago.test.ts`                                                                                                                      | For twenty-five screen shapes. Eight are what a phone's or tablet's browser leaves a page according to the device profiles (an iPhone 13 at 390×664 and 750×342, an iPhone SE at 375×553 and 667×331, a Pixel 7, a small Android, an iPad). Seven more are phones held sideways as they really are: three iPhones with their notch and home bar taken off, and four Android phones with their browser's bars taken off, down to 640×256. For each: the right arrangement is chosen, the single row on the flattest; every island is inside the free part of the screen; every tap area is at least 96 pixels square, except on the two narrowest phones held sideways, where it is 90 and 81 wide; no two overlap; the lighthouse is never inside one; the guide, boats, rocks and clouds are clear of every island and every name; a name in a row never reaches its neighbour's; the camera's target agrees with the arithmetic                                                   |
| **Island models** (Phase 02)                                      | `tests/render/islands.test.ts`                                                                                                                          | Each of the seven models stays inside the room the layout gives it, followed through the motion of its moving parts; is modelled rather than a placeholder; is under 40,000 triangles at every tier and lighter on the lowest; stores each corner once; builds identically every time                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **The hub's pictures** (Phase 02)                                 | `tests/render/sprites.test.ts`, `hubPicture.test.tsx`                                                                                                   | The committed pictures were rendered from the models as they are now (a hash of the sources); one for every island and floating thing, the right size, not too heavy; the page puts each where the layout says, far islands first, and lifts the one pointed at                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **The guide** (Phase 02)                                          | `tests/ui/guide.test.tsx`                                                                                                                               | A pose for every state; hidden from assistive technology; points with the arm on the right side and by the right angle; unique gradients when two are on a page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Assets** (Phase 02)                                             | `tests/config/assets.test.ts`                                                                                                                           | Everything in `src/assets` and `public` is in the manifest; every listed path exists; nothing from elsewhere lacks a source, a holder and an allowed licence; no shipped file contains the address of another site                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **The lesson's scripts** (Phase 03)                               | `tests/game/lessonScript.test.ts`                                                                                                                       | What Glim shows for each thing that can happen: a demonstration counts the group, then its match, then lights them; a guided step is put and counted; a step alone is put and nothing more; a right answer plays the same notes on both sides, a wrong one a different number and never "the same"; no script shows the answer of a step being asked; every script runs forward in time and ends within eight seconds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Sound on a phone** (Phase 03)                                   | `tests/app/audio.test.ts`                                                                                                                               | The cue of the touch that woke the audio plays when it wakes, and is dropped if that takes too long; nothing waits once sound is off; counting notes climb and stop at the top of the scale; every motif is short and quiet; Safari is asked to treat the sound as media, and a browser without that setting, or one that refuses it, is left alone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Small hands** (Phase 03)                                        | `tests/app/touch.test.ts`                                                                                                                               | **A resting finger:** a long press opens no browser menu over the game for touch or pen; a mouse keeps its right click; what is written for grown-ups and anything typed into keep theirs. **More than one finger:** a tap made while a thumb rests on the screen, or during which another finger lands, is answered once; nothing is added when the browser answers it itself, and a click the browser sends late for it is dropped; the thumb that was resting presses nothing; nor does a finger that slid away or that the browser took for scrolling; nothing disabled, covered or gone is pressed; fields, a mouse and a pen are left alone; it makes no difference which way round the browser reports the last finger lifting. **A slow press:** one quick finger is left entirely to the browser; a press of between a third of a second and a second is answered once, and not at all if the browser answers it; a finger that stays longer than a second presses nothing |
| **Things a child makes** (Phase 04)                               | `tests/engine/tasks.test.ts`, `robot.test.ts`, `models.test.ts`                                                                                         | Each kind of task is judged by its rule: what is right, which parts of a wrong try were right, what counts as done cleanly, and that a malformed answer changes nothing. The robot's interpreter stops at a rock and at the edge, and the solver finds the shortest row. Each toy model gives the same result every time, and changing one part changes the result as the model says                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Every world's content** (Phases 05 to 10)                       | `tests/content/*Rules.test.ts`, `generated.test.ts`, `robotJourneys.test.ts`                                                                            | Each pack passes its world's rules; each rule fires on a copy of the pack broken to make it; a test reads each rules file and fails if a rule has no such case. Each pack is byte for byte what its generator writes. Counts the documents quote are pinned: letters taught, words read, stories, maps                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **The voice** (Phase 04)                                          | `tests/config/voice.test.ts`, `tests/app/voice.test.ts`                                                                                                 | Every line that can be said has a recording, and nothing else does; no recording has changed since it was made; none was heard as other words. The narrator says one line at a time, stops when told, forgets a failed download and remembers an undecodable file, and reports a line that will not be heard as taking no time                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Pictures and words** (Phase 05)                                 | `tests/game/pictures.test.ts`, `explorerHarbor.test.ts`                                                                                                 | The picture kit, the lexicon and the drawn letters agree; every word to be read is spelt as it sounds from letters that have a shape. The storybook and its drawings are the same set; the maths of a map says land only well inside a shore                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **What each world shows** (Phases 05 to 10)                       | `tests/game/readingCove.test.ts`, `memoryForest.test.ts`, `explorerHarbor.test.ts`, `robotScript.test.ts`, `robotRun.test.ts`, `inventorIsland.test.ts` | Each world's scripts, as pure data: a word is said slowly before it is asked about; things to remember are uncovered, covered, and only then asked about, and never uncovered again for the asking; a story is told as far as it goes and told back in order; a robot's run is the frames the interpreter gives                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **What has been finished** (after the six worlds)                 | `tests/game/progress.test.tsx`                                                                                                                          | A page that is the first thing opened finds out who is playing by itself, once, and then says what they have finished; on a device nobody has played on it says nothing and stays so; the next thing to do in a world, and on the map                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Asking again** (after the six worlds)                           | `tests/game/again.test.tsx`                                                                                                                             | It belongs to one step, and the next starts as if nothing had been asked; an asking that comes before a showing is over starts the step again and is not "again"; the event of a tap is not taken for "not yet"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **What the browser tests decide by** (after the six worlds)       | `tests/config/e2eDiagnosis.test.ts`                                                                                                                     | WebKit's words for a download it could not load are recognised, cut short or whole, and nothing else is taken for them; the preview server notes each page as it arrives and again when it has answered, and nothing else, and only when told where; and what a test that ran out of time is told about its page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## What the browser tests cover (Playwright, against the production build)

The build is served by `vite preview` with the `vercel.json` rules applied, so the tests run under the production
Content-Security-Policy, headers and routing.

**Every test also fails on:** any console error or warning, any uncaught exception, any failed request, any HTTP
status of 400 or more, and any request to another origin. (One thing passes on its own: a download the browser
cancelled because the page had gone on to load another document, in whichever of its two ways the browser reports
it.) Exceptions are named one by one in `e2e/fixtures.ts`
(software-renderer noise, Playwright's own notices) or in the single test that expects them.

| Project (engine)                                                          | Screen                     | Tests                                                                                                       |
| ------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `desktop` (Chromium)                                                      | 1366×768                   | all 250                                                                                                     |
| `phone` (Chromium, touch)                                                 | 390×844                    | all 250 (keyboard journeys, and the activities played to the end once on the desktop, are skipped)          |
| `phone-landscape`, `tablet`, `small-phone` (Chromium, touch)              | 844×390, 768×1024, 360×740 | the 32 layout tests each                                                                                    |
| `android`, `android-landscape` (Chromium as a Pixel 7)                    | 412×839, 863×360           | the 32 layout tests and the 4 journeys each                                                                 |
| `webkit-desktop`, `webkit-phone` (WebKit)                                 | 1366×768, 390×844          | all 250 each, in CI only (what needs the 3D scene, the service worker or Chromium's touch handling skipped) |
| `iphone`, `iphone-landscape`, `ipad` (WebKit as an iPhone 13 and an iPad) | 390×664, 750×342, 810×1080 | the 32 layout tests and the 4 journeys each, in CI only                                                     |

The named devices are Playwright's descriptions of them: the screen the device's browser leaves a page with its
bars showing, its pixel ratio, touch, and its user agent, on a desktop build of the engine. They are not the
devices, and in two ways they are kinder than the devices. For an iPhone held sideways the description is the 750
pixels _inside_ the notch's margins; a page that asks for the whole screen, as this one does, is 844 wide there
and is told which parts to keep clear. And for an Android phone held sideways it is 360 pixels of height, where a
phone 360 pixels wide leaves a page about 264 to 280. `phones.spec.ts` tests both as they are.

| Spec                                  | What it proves in a real browser                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `journey.spec.ts` (Phase 03)          | **A brand-new child**: the front door (Glim, six pictures, the map behind it switched off), one tap to choose, the map with Glim pointing at the island that is open, its page with the example, the demonstration (nothing answerable; the group and its match lit at the end), five steps answered by looking at how many there are, a calm end, and home with no front door. **Asked once a visit**: a refresh goes straight to the map; a new visit shows that player's picture. **When it does not go right**: a wrong answer is set aside and the remaining choice shown; "show me again" gives nothing away; help comes in two steps; pause covers the board, holds focus, has the two switches, and closes with Escape; a refresh keeps the step, the choice set aside and the help used; leaving for home keeps the place. Tagged `@journey`                                                                                                                                                                                                                                                                                                                                                                              |
| `phones.spec.ts` (Phase 03)           | **A notch.** With a notch's margins and a home bar's given to the page, nothing a child sees or presses lies in them on the front door, the map, a world's page, the demonstration, a question, the pause sheet or the grown-ups' gate, and the islands still do not touch. Tagged `@layout`, so it runs on every project. **A flat screen** (800×264 and 640×256, about what Chrome leaves a page on an Android phone held sideways): the islands stand in one row, each large enough, none touching, every name whole; Play, "My turn" and the choices are each on the first screen; and the end of the activity fits, clear of the way home, with both its buttons on screen. **Small hands** (Chromium only): real touch sequences, sent through the browser's own touch handling — a tap while a thumb rests on the screen, a tap during which another finger lands, and a slow press by one finger each flip a switch exactly once; an island opens and a question is answered with the thumb where it was. The page's rules against bouncing, reloading on a pull and zooming on two quick taps are read back. **The notch, the flat screen and the two-finger taps all fail on the code as it was before the second look** |
| `shell.spec.ts`                       | Six worlds, laid out for the screen, each a large target wholly on screen with no overlap, names never cut short or off the screen; a world's page shows its own island; real links, Back and Forward, titles, focus; deep links and refresh; not-found; sound and calm-motion toggles work and are remembered; calm motion really stops every animation on the home screen; sound really plays after a touch and stops when muted; keyboard, skip link, focus ring                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `hub.spec.ts`                         | The picture is there first; the 3D scene arrives in its own chunks and draws a real scene (decoded from a screenshot: many colours, paler water far away); it moves gently, and not at all under reduced motion; it is taken down on leaving and rebuilt on return; a lost graphics context, a failed download or no WebGL each leave the picture; on automatic, a software-only renderer keeps the picture; the 3D code is never fetched where it is not used. **The map:** every island answers a tap at five points across it; a tap on a landmark or on a name opens that island; each picture sits exactly under its tap area; the lighthouse goes nowhere; focus lifts an island; Tab reaches the worlds in teaching order; the guide points at the open island, clear of every other, and waves when tapped. **Picture and 3D put every island in the same place.**                                                                                                                                                                                                                                                                                                                                                         |
| `lesson.spec.ts`                      | A new player finishes the activity by looking and tapping; wrong answers are set aside, taught and never counted as independent; help comes one step at a time and is recorded; the guide points, wonders, is glad and is patient at the right moments; a double tap counts once; **a refresh mid-question resumes at the same question with the pictures in the same places**; the activity fits one screen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `grownups.spec.ts`                    | The press-and-hold gate (pointer and keyboard); add, switch, change and remove players; separate records; save a copy, erase, load it back; a damaged or foreign file is refused; settings; diagnostics; fits the screen with the longest names                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `resilience.spec.ts`                  | **Lost storage:** wiped between visits, and wiped while the page is open; IndexedDB refused (progress kept in localStorage and survives a reload); all storage refused (still playable, and the grown-up is told); a part that cannot be downloaded shows a calm message and recovers on reload                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `offline.spec.ts`                     | With the real service worker: what was opened once opens again with no network and progress is kept; a part never opened says so; installing downloads the first screen only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `a11y.spec.ts`                        | axe-core, WCAG 2.1 A and AA rule sets, on the front door (first visit and returning), the hub, world pages, five states of the activity, the pause sheet, the end of an activity, the grown-ups gate, area and a dialog, and the not-found page: no violations. Each check waits for the page to finish arriving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `smoke.spec.ts`                       | Security headers, deep links, cache rules, the installable-app files, and a clean start. Tagged `@smoke`: these are the tests to run against a real deployment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `everything.spec.ts` (the six worlds) | **Every activity of four worlds played from its first screen to its last**, by the answers its content says are right, with motion reduced so that only what the game insists on is waited for; and a test that fails if any activity of any world is played to the end by no test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `a11y-worlds.spec.ts`                 | axe-core, WCAG 2.1 A and AA, on every world's page (and again held sideways) and on every activity of those four worlds, while it is shown and while it is asked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `garden.spec.ts`                      | Number Garden's boards: a group taken in at a glance is covered before the choices are turned over, and another look is help; giving one at a time, taking back, and saying when it is done; more, fewer and equal each ask one thing **Asking to be told again in one step takes nothing from the next, and asked before a look is over it starts the step again with the look still to come** (with the clock held); a world's page opened by its own address, and loaded again, knows what has been finished; the button to take one back is the same button all through a count                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `reading.spec.ts`                     | Reading Cove: with sound off an activity shows a gate and starts when it is opened; a sound can be heard again; a wrong picture is answered with its own sound; a printed word is read before its pictures are offered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `memory.spec.ts`                      | Memory Forest: **nothing that is covered can be read off the page**; the cards to answer with are blank while things are on show; two that differ turn back; an order is shown again only as help; the question about the very start comes last **An order being shown takes no tap until all of it has been shown**: a tap is made in every pause, with the clock held, and none counts; asking again in the middle of an order gives it whole, and takes nothing from the next                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `harbor.spec.ts`                      | Explorer Harbor: a story is put in order and **told back picture by picture, each lifted while its own line is written under it**; a missing picture is nowhere in the page until it is found; **every place on a map is drawn where the content says, with land under it or not as the answer says**; places are 56 points or more and apart, down to 640×256; the boat sails to the island chosen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `robot.spec.ts`                       | Robot Ridge: each of four activities played rightly and wrongly by reading the ground from the screen and solving it; a run pauses and goes on; help; the keyboard; with less motion the way is marked instead of walked; axe on every board; the largest boards on 360×740 and 640×256                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `inventor.spec.ts`                    | Inventor Island: a guess is tested there and then, and one that did not come true is kept beside what happened; a mend tests a change only when something has changed; help; every activity played to the end; standing still where nothing should move; sideways with a notch; axe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `voice.spec.ts`                       | The lines of an activity are fetched from the game's own files when wanted, and said; nothing is fetched with the sound off; a recording that cannot be fetched is done without; the voice stops on pause; every recording is listed for a grown-up, plays, and keeps its mark                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Sizes (`npm run verify:dist`)

| What                                           | Size (gzip) | Budget  |
| ---------------------------------------------- | ----------- | ------- |
| Script for the first screen                    | 101.9 kB    | 110 kB  |
| Styles for the first screen                    | 7.3 kB      | 12 kB   |
| Fonts                                          | 67.2 kB     | 80 kB   |
| The hub's pictures (WebP, not gzipped)         | 283.2 kB    | 330 kB  |
| 3D hub (on demand)                             | 259.7 kB    | 290 kB  |
| Largest other on-demand part (Explorer Harbor) | 12.2 kB     | 30 kB   |
| Whole build without the voice, uncompressed    | 2635.3 kB   | 2900 kB |
| The voice: 395 recordings (MP3, not gzipped)   | 4344.9 kB   | 9000 kB |
| The largest recording                          | 32.8 kB     | 60 kB   |

The six worlds added 1.0 kB of script to the first screen (what every world offers, and which is next), and
nothing else: a world's code is 2.5 to 12.2 kB and its content 3.5 to 6.8 kB, each fetched on entering that world;
the lesson frame is 8.2 kB and the part of the engine that judges answers 5.4 kB, fetched with the first
activity; and a recording is fetched the first time its line is wanted. The whole build is now within a tenth of
its budget, which was raised from 2600 to 2900 kB when the voice's tools were added; the next world's worth of
drawings will need it raised again or something made smaller.

The verifier also proves, on the built files: one entry script; no 3D code, studio, character sheet, world or
recording reachable from it by static import; no inline script or style (so the CSP holds); no development URL in any file; the manifest and
its icons; and that the service worker pre-downloads exactly the first screen's files and knows every hashed file.

## Screenshots

`docs/review/worlds/` — 57 JPEGs of the six worlds, taken from the running production build by
`npm run screens -- worlds worlds` (headless Chromium, 2× pixel density): each world's page; every activity at the
first thing a child does in it, on a 390×844 phone; the first activity of each world while Glim is showing it;
and the last activity of each world on a phone held sideways. The list of activities is read from the content
packs, so none can be missed. They were looked at; `docs/QUALITY_REPORT.md` says what was seen.

`docs/review/phase-03/` — 101 JPEGs taken from the running production build by `npm run screens` (headless Chromium,
2× pixel density); six of the first round at half size in `round-1/`; and three of how things were before the
second look at phones, at half size, in `phones-before/`.

| Set                                                                                                                                   | Sizes                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| The front door, first visit                                                                                                           | 390×844, 844×390, 360×740, 768×1024, 1366×768, 750×342 |
| The front door with two players; arriving on the map                                                                                  | 390×844, 1366×768                                      |
| A world that is open, and one that is not                                                                                             | 390×844, 1366×768, 750×342                             |
| The activity, nine states: counting, the same, a guided question, right, a question alone, wrong and compared, help, paused, finished | 390×844, 844×390, 768×1024, 1366×768, 750×342          |
| Tooltips: keyboard focus, hover on the guide, hover on a switch                                                                       | 1366×768                                               |
| Click maps, seven screens: front door, map, world, demonstration, question, paused, finished                                          | 390×844, 1366×768, 750×342                             |
| Phones, a flat screen: the map in one row, with its click map; a world's page; a question; the end of an activity                     | 800×264, 640×256                                       |
| Phones, a flat screen: the map in one row as the 3D scene draws it                                                                    | 800×264                                                |
| Phones, a notch and a home bar, shaded: the front door, the map, a world's page, a question, the pause sheet                          | 844×342                                                |

750×342 is the part of an iPhone 13's screen, held sideways in Safari, that lies inside the notch's margins: the
tightest screen there is a profile for. The phone itself gives this game 844×342 and the margins to keep clear
of, which is what the notch pictures show; and an Android phone held sideways leaves a page less height than
either, which is what 800×264 and 640×256 are. The hub at other sizes, the islands, the guide's sheet and the
grown-ups' area were not re-captured; they are as in `docs/review/phase-02/`.

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
What Phase 03's screenshots, click maps and tests found — fifteen things — is in `docs/QUALITY_REPORT.md` → _Seen
— cause — fix_; the two that tests found in the game itself are repeated here, after the three faults of the
second look at phones.

| Found by                                                                                             | Fault                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A green CI run read for the tests it had retried, and an update rehearsed** — after the six worlds | **Five faults in the game, the worst of them that one tap on Glim took the first showing away from every later step of an activity.** They are set out, with how each was found and the test that now fails without its fix, in _What was found after the six worlds went live_, above.                                                                                                                                                                   |
| **Real touch sequences, sent through Chromium's touch handling** — Phase 03, the second look         | **A tap made while another finger rested on the screen did nothing at all.** A browser answers a tap only from the one finger on the screen; a child's thumb over the edge of a phone is a second. A short press beside another finger is now answered once (`src/app/touch.ts`).                                                                                                                                                                         |
| **The height a phone's browser really leaves** — Phase 03, the second look                           | **On an Android phone 360 pixels wide held sideways, the islands were 70 pixels wide, their tap areas overlapped and their names collided; and the end of an activity lay under the way home and ran past the bottom of the screen.** The device profiles give such a phone 342 to 360 pixels of height; it has about 264 to 280. The map now stands in one row there, 101 pixels an island, and the end of an activity fits.                             |
| **A notch given to the page** — Phase 03, the second look                                            | **A world's page lay 35 pixels under the margin an iPhone's notch needs when held sideways.** The device profile is the screen inside those margins, so nothing showed. Reading pages now keep clear, and a test gives every screen the margins.                                                                                                                                                                                                          |
| **Device profile (a Pixel 7 held sideways)** — Phase 03                                              | **Play was below the first screen of a world's page.** The example of the activity had added a row above it. The place and the way in now sit side by side there.                                                                                                                                                                                                                                                                                         |
| **Click maps** — Phase 03                                                                            | **Two controls were under size on a phone held sideways**: "carry on" on the pause sheet (72 pixels, where a default outranked its own size) and the way home in the top bar (44). They are 84 and 48.                                                                                                                                                                                                                                                    |
| **Unit test (model sizes)** — Phase 02                                                               | **Sunflowers, a tree's crown and a flag reached outside the room their islands were given**, so pictures of them were cut off and a neighbour's tap area could have covered them. Room is now measured as drawn on screen, and every model is measured against it.                                                                                                                                                                                        |
| **Unit test (layout)** — Phase 02                                                                    | A cloud placed over the lighthouse island on a tablet, a boat over a name on a sideways phone, the guide over an island's name on a phone: all placed by eye. They are now placed by the layout's arithmetic.                                                                                                                                                                                                                                             |
| **Browser test under load** — Phase 02                                                               | **When the 3D code could not be downloaded, React sometimes wrote the error to the console** (two runs in twelve). The hub fell back correctly, but a thrown error is the wrong tool for an ordinary event: the 3D code is now fetched by hand.                                                                                                                                                                                                           |
| **Idle-cost measurement** — Phase 02                                                                 | The picture hub kept a quarter of a core busy: twenty stepped animations, each on its own clock. One shared beat brought it to 14%.                                                                                                                                                                                                                                                                                                                       |
| Screenshot capture — Phase 02                                                                        | A picture still being decoded is left out of the frame a screenshot takes ("complete" is not "drawn"): captures and tests now wait for decoding.                                                                                                                                                                                                                                                                                                          |
| **The times in a green CI run** — Phase 02                                                           | **The browser tests of the 3D scene had less time than their own steps were allowed**, and on the CI machine one of them took 46.8 and then 59.8 of its 60 seconds. They now have three minutes. A trial of running the hub's tests in order was taken out again, and whether it helped cannot be told: the CI machine's own runs differ by more than the trial did (_Continuous integration_, above). Tests only; the game is unchanged.                 |
| Browser test — Phase 02                                                                              | The first Tab press reached the guide before any island; the test of calm motion was measuring an emblem that is no longer on the page (rewritten to measure everything that moves on the home screen).                                                                                                                                                                                                                                                   |
| `verify:dist`                                                                                        | The bundler's grouping made the 3D code a static dependency of the first screen.                                                                                                                                                                                                                                                                                                                                                                          |
| Offline browser test                                                                                 | Files fetched at install could never be found again: browsers send `Origin` with module requests and the server answered `Vary: Origin`. The worker's lookups now ignore `Vary`.                                                                                                                                                                                                                                                                          |
| Console guard                                                                                        | An unknown `Permissions-Policy` feature; a three.js shadow mode that no longer exists; a deprecation notice triggered inside React Three Fiber (filtered by exact text, everything else still shown).                                                                                                                                                                                                                                                     |
| Layout tests                                                                                         | World names cut off at 360 px; a hidden file input announced as a second button; question cards morphing into the next question; tile pictures overflowing on a sideways phone.                                                                                                                                                                                                                                                                           |
| Unit test (counting pictures)                                                                        | Things overlapped or left their box for groups of four to ten.                                                                                                                                                                                                                                                                                                                                                                                            |
| **WebKit in CI**                                                                                     | **A long button label ("Save a copy of …") made the grown-ups area wider than a phone.** Chromium's phone emulation hid it: it widens its layout viewport to hold the content, so `scrollWidth` equalled `innerWidth`. The label now wraps, and every layout test measures against the configured screen size and checks each control's edges (`screenFit` in `e2e/fixtures.ts`).                                                                         |
| **WebKit in CI**                                                                                     | **After one failed download of a lazy part, "Load the page again" did not recover.** WebKit kept the failed preload and reused it. Lazy parts are now fetched by their own `import()` rather than a late `<link rel="modulepreload">`.                                                                                                                                                                                                                    |
| WebKit in CI (tests, not the app)                                                                    | WebKit forgot a test's override set on the `indexedDB` object (now set on the prototype); Playwright's screenshot stylesheet is refused by the CSP and WebKit reports it (allowed, on WebKit only); a download cancelled by a test's own reload was counted as a failed request (the guard now tells the two apart).                                                                                                                                      |
| **The slow Chromium CI runner**                                                                      | **The idle home screen, in its illustrated form, kept a whole CPU core busy** (seven SVG animations at 60 frames a second under a backdrop blur). It starved the rest of the run: the grown-ups gate took up to six seconds to open instead of two, and nine desktop tests timed out. The animations now move in steps and the blur is gone (100% of a core → 10%). Tests also hold the gate's button until the area appears instead of for a fixed time. |
| Measuring the above                                                                                  | Software-rendered 3D costs more than three cores for 8 to 27 frames a second, so on automatic a software renderer now keeps the illustration.                                                                                                                                                                                                                                                                                                             |
| Chromium in CI (tests, not the app)                                                                  | With a service worker in control, Chromium sometimes declines to reuse a file that `index.html` preloaded and fetches it from the worker again, with a console remark. Harmless; allowed in the offline tests only, with the reason beside it.                                                                                                                                                                                                            |
| Screenshot review                                                                                    | See `docs/QUALITY_REPORT.md`.                                                                                                                                                                                                                                                                                                                                                                                                                             |

## Phones and tablets: exactly what is and is not verified

The requirement since Phase 03 is that the game work on Android and iOS devices on a Vercel deployment. This
section is the whole truth about how far that has been checked. `docs/DEPLOYMENT.md` → _Trying it on a real phone
and tablet_ is how to check the rest.

### iOS and iPadOS

**Verified:** the WebKit engine, as built by Playwright for Linux, running headless in CI at 1366×768, as an
emulated 390×844 touch phone, and — for the layout tests and the journeys — as an iPhone 13 upright (390×664) and
sideways (750×342) and as an iPad (810×1080), with their pixel ratios and user agents. On it: layout and screen fit, navigation, deep links and refresh, the whole activity by
touch, saving and resuming in IndexedDB, both storage-refusal paths, lost storage, players, export and import, the
press-and-hold gate, sound toggling, calm motion, the hub as a picture with its tap areas and the guide,
accessibility checks, and headers.

Phase 03 added to that list: the front door, the whole journey from it to the end of an activity and home, the
pause sheet (a `<dialog>`), and every screen at the sizes the device profiles give.

The second look added: every screen with a notch's margins and a home bar's given to it — as an iPhone 13 upright
and sideways, as an iPad, and on the two plain WebKit projects — and the map in one row on a flat screen. It also
showed what the sideways profile is not: 750×342 is the screen inside the notch's margins, and the page itself is
844 wide there.

**That is not Safari, and it is not an iPhone.** It shares the layout and JavaScript engine. It does not share
Apple's graphics, audio, storage policy, touch handling, browser chrome or installation behaviour.

**Not verified on WebKit at all** (skipped there, and why):

| Skipped                                                                               | Why                                                                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| The 3D hub, what a software renderer is given, and picture against 3D (8 per project) | Headless WebKit on Linux has no usable WebGL. Only the picture is tested there. |
| Offline and the service worker (3 per project)                                        | Run in Chromium only.                                                           |

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

New in Phase 03, and likewise untried on any Apple device:

- that the first tap's sound is heard, now that it waits for the audio to wake;
- that asking Safari to treat the game as media keeps its sounds on when the ring/silent switch is off;
- that a finger resting on an island or a picture gets no call-out and selects nothing;
- that coming back from another app meets the pause sheet, and that "carry on" brings the sound back;
- what an iPad too old for the game actually shows (it should be the notice, after eight seconds);
- whether Safari ignores a tap made while another finger rests on the screen, as Chromium does, and whether the
  answer built for that works there. It is tested in Chromium only, and written so that it can only add a click
  where the browser gave none;
- the notch for real: the margins an actual iPhone reports, a Dynamic Island, the phone turned the other way;
- that the page does not bounce or reload when pulled, and that two quick taps do not zoom it.

### Android

**Verified:** Chromium, headless, as a 390×844 touch phone, and — for the layout tests and the journeys — as a
Pixel 7 upright (412×839) and sideways (863×360), with its pixel ratio and user agent; locally and in CI. On it:
everything in the browser-test table above, including the 3D hub drawn by a software renderer and the service
worker.

The second look added two things that are nearer to a phone than the profiles are. The map, a world's page and
an activity from its first screen to its last at 800×264 and 640×256, which is about what Chrome leaves a page on
a phone 360 pixels wide held sideways: its 360 of height less a status bar of about 24 pixels, Chrome's bar of
about 56, and a gesture bar where there is one. Those are the usual sizes of those bars as I know them; none was
measured on a phone. And taps made beside a resting finger, sent as real touch sequences through Chromium's own
touch handling, which is — as I understand Chromium's source, and without having checked it on a phone — the code
Chrome on Android also uses to decide what is a tap.

**That is not Chrome on a phone.** Not verified on any Android device: the 3D hub on a phone's GPU; sound; that a
long press on an island opens no menu (the guard is unit-tested, the gesture is not); pull-to-refresh being off;
the back gesture; the address bar coming and going, and the height it really leaves on a given phone; whether a
slow press, which a phone takes for a long press, is answered as it is meant to be; a palm; installing to the
home screen; a low-memory phone.

**Before anyone relies on this build on a tablet or phone, open it on one.** `docs/DEPLOYMENT.md` has the sixteen
things to try, in order.

## Seen only on the CI machine, and explained

On the page that follows a finished lesson, the main thread stalls for one to two seconds, about a second after the
page starts. A temporary probe recorded a browser trace of it in CI: Chromium destroys the previous page's compositor
(`LayerTreeHost::~LayerTreeHost`) and waits for the GPU process to finish its queued work, and on that machine the
"GPU" is SwiftShader, a CPU emulation. Nothing in the game causes it; it does not happen on the faster machine this
was developed on, even with the CPU throttled; and with the home screen no longer starving the runner it no longer
delays anything a test waits for. It has not been checked on a device with a real GPU, where that wait should be
milliseconds.

After the 3D scene of Phase 02 the same kind of wait is far longer, five to thirty seconds, and it falls on the next
test: see _What the times in those runs said_, above.

## The live site

The owner connected the repository to Vercel during this work; production is `main`, at
`https://training-academy-dun.vercel.app`. What was run against it, each time in Chromium as a desktop and as a
390×844 phone, from the container this was built in:

| When (2026-11-23)                                  | What was live                                   | What was run                                                                                                                            | Result                                                                                                                                               |
| -------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before pull request #5 was merged                  | Phase 03: one world, one activity               | the 16 smoke tests (`BASE_URL=… npx playwright test`)                                                                                   | 16 passed                                                                                                                                            |
| After the owner merged it (`334e0e8`)              | the voice, and Number Garden's seven activities | the 16 smoke tests                                                                                                                      | 16 passed                                                                                                                                            |
| The same                                           | the same                                        | each world's page opened and counted                                                                                                    | Number Garden offers seven activities and Play; the other five say they are not open                                                                 |
| The same                                           | the same                                        | Number Garden's first activity opened by a tap, as a phone                                                                              | six recordings fetched from the site itself, each a 200 and `audio/mpeg`; no error, no warning, no other site                                        |
| After the owner merged pull request #6 (`0e836eb`) | all six worlds                                  | Vercel's own record of the deployment, and the service worker the site serves compared with the one a local build of that commit makes  | "Ready"; the same, byte for byte                                                                                                                     |
| The same                                           | the same                                        | each world's page opened by its address and counted                                                                                     | 10, 7, 4, 6, 4 and 8 activities, each page with Play; none says it is not open                                                                       |
| The same                                           | the same                                        | the first activity of each of the five new worlds opened by a tap, as a phone                                                           | each started and fetched its recordings (five to ten of them) from the site itself, each a 200 and `audio/mpeg`; no error, no warning, no other site |
| The same                                           | the same                                        | 52 browser tests: the 16 smoke tests, and the 36 tests of the Pixel 7 screen (`--project=android`), which play something in every world | 52 passed                                                                                                                                            |

That is evidence that Vercel serves what was built, with the headers and routing the tests expect, and that the
voice's files arrive. It is not a phone, and nobody has heard those recordings play. Nor is it evidence that
what was built was right: the five faults in _What was found after the six worlds went live_ were on the site
while every one of these checks passed.

## An update, rehearsed

`npm run rehearse:update -- <commit>` (`scripts/rehearse-update.mjs`): two real builds and one browser, in
Chromium as a phone. The build of the commit is served. On it an activity is finished, a second is left at its
third step, a tab is left in the middle of a third, and another on the map. Then the other build is served at the
same address, as a deployment puts one build in the place of another, and eighteen things are checked.

| From                                                         | To                                  | Result                                                                                                                                           |
| ------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `334e0e8`, the build before the six worlds: what a phone had | `0e836eb`, the build that went live | **16 of 18.** The two that failed: a world's page opened by its address did not show what was finished, and Play went back to the first activity |
| `0e836eb`, what is live                                      | this tree                           | **18 of 18**                                                                                                                                     |

What held both times:

- the tab left in an activity played on to its end, on the code it had;
- the tab left on the map, asked for the grown-ups' area — which it had never fetched, and which the new build
  keeps under another name — said "This part could not be loaded", offered to load the page again, and so
  arrived at the new build with the player's record as it was;
- the site opened again by its address was the new build at once;
- the activity left at its third step was taken up at its third step, and finished;
- nothing that had been stored was missing afterwards;
- while an old tab was open both builds were kept; with the old tabs closed, the new service worker took over
  and cleared the old build out;
- after that the map, the world and the activity that had been opened all opened with no connection;
- no page of the new build put anything on the console. (The old tab did, as it must: a 404 for a file that is
  no longer there.)

The first row is the update the six worlds were, done again with the same two builds: the service worker of its
second build is, byte for byte, the one the live site serves. It is still not the owner's phone. It is
Chromium, the one engine in which a service worker and the network can be driven together, and how Safari times
an update is not shown.

## Also not done

- No Firefox run.
- The whole suite has not been run against the live site, only what _The live site_ lists; and WebKit has never
  been pointed at it.
- The update rehearsal is run by hand before a release, in Chromium only. CI does not run it.
- The tests' new rule for WebKit's second report of a cancelled download (run 30, above) has been tested with
  WebKit's words but not yet in WebKit, which runs only in CI.
- No performance measurement on real hardware (`docs/QUALITY_REPORT.md`).
- No screenshot-comparison tests; screenshots were reviewed by eye.
- No person has listened to any recording.
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
