# Test results

Everything in this file was actually run. Where something was not run, it says so.

- **Date:** 2026-11-26
- **Code under test:** `main` as the owner merged it on 2026-11-26 (pull request #16: Explorer Harbor's
  room for making a story, the globe's turn and the grown-ups' page mended), with the pull request this
  document came with: phase 12, which chooses what to offer next. The release check below was run on that
  tree after the last change to it. What was run on the live site was run on what was live, and says so.
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

| Step                   | Result                                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check` | clean                                                                                                                                                                            |
| `npm run lint`         | no errors, no warnings                                                                                                                                                           |
| `npm run typecheck`    | no errors (TypeScript strict, plus `noUncheckedIndexedAccess`)                                                                                                                   |
| `npm test`             | **2724 tests in 95 files, all passed**                                                                                                                                           |
| `npm run build`        | built; 843 files in `dist/`, 736 of them the voice's recordings                                                                                                                  |
| `npm run verify:dist`  | **1849 checks, all passed** (sizes below)                                                                                                                                        |
| `npm run test:e2e`     | **1535 browser tests, in two runs: none failed, and none needed a second attempt** (Chromium, seven screen shapes; the first run was stopped by a restart of the machine, below) |

**What the browser tests were run on, exactly, for phase 12.** The whole suite was started in one go, in
Chromium on all seven screens, on phase 12's tree after its last change to anything but a document. At 1351
of its 1535 tests (every test as a desktop, as a phone, as a tablet and as a phone held sideways, and 13 of
the small phone's), **with none failed and none at a second attempt**, the machine it ran on was restarted
and the run stopped with it, before it could print its totals. The tests of the three screens it had not
finished were then run on the same tree: the small phone, and the Pixel upright and sideways, 197 tests, **197 passed** and none passed over, in 13.3 minutes.
So every one of the 1535 has run on this tree and none has failed; how many of the first 1351 were passed
over by design, and not run, the stopped run did not say (on the earlier runs it was about 240 of the
suite, all on the desktop and the phone). In between, the owner merged pull request #16, and the branch was
begun again from `main` with phase 12 kept: the tree under test did not change.

**Before that, with the room for making a story.** The whole suite was run in one go, in Chromium on all seven
screens, on the tree with the room for making a story in it: **1505 tests, 1264 passed, 241 skipped by
design, none failed** (58.3 minutes). By screen: desktop 429 passed, phone 522, the tablet, the small phone
and the phone held sideways 61 each, and the two Android shapes 65 each. The 241 skip themselves and say why:
167 on the desktop, which are measurements made once, as a touch phone (136 of them the sizes of what is
pressed, and four the room's on its four smallest screens), the tests only Safari's engine can run, and the
globe turned in the hand; and 74 on the phone, which are the activities played to their ends once, on the
desktop (59), the keyboard journeys, every way through a story, which is walked once, and the tests of the
tests' own guard and limits, which are run once. None is skipped on the other five screens any more: the
globe turned in the hand was listed there and passed over, and is now listed only where it is run. One of the
1264 is the test that is built to fail by the guard and by nothing else, on the desktop: it failed, and
failing is what it is for.

**One thing was changed after that run, and it is not a document.** While the suite ran, the owner merged
pull request #15, and CI's run on that merge had a test of the globe pass only at a second attempt (_Run 54_,
below). The cause was a fault in the game. It was mended in `GlobeBoard.tsx`, a test was written for it and
shown to fail without the mending, and **the globe's tests were then run again on all seven screens: 36
tests, 34 passed, 2 skipped by design, none failed** (13 each as a desktop and as a phone, with one passed
over on each, and two on each of the other five). The rest of the suite was not run again: nothing else
draws the globe. The unit tests, the build, its checks and the rehearsal of the update are of the tree as
it is committed. **WebKit is CI's**, as always.

**And three things were changed after CI's first run on that tree** (_Run 55_, below), in which one test
failed and another passed only at a second attempt. The test of the globe's mended turn was written again:
it had asked how many pictures a browser draws in a tenth of a second, and WebKit on CI's machine drew fewer
than it asked for. The grown-ups' page now says nothing of any skill until it has read the record: for a
moment at every opening it had said "Nothing recorded yet", and a test read it in that moment. And the
browser tests can be given a slower processor (`SLOW_CPU`), which is how the first of these was met here. Six
unit tests came with the page's change, each shown to fail with its fault put back. **The seven files of
browser tests that turn the globe or read that page were then run again on all seven screens: 149 tests, 146 passed, 3 skipped by design, none failed.** The
rest of the suite was not run again: nothing else draws the globe or reads that list.

**And two more after CI's run on that** (_Run 56_, below), in which the test just rewritten passed in Safari's
engine and another test, untouched by any of this, failed there. That one measured two answers side by side
while the first of them was being offered, which lifts it; it now waits for the board to say it has shown its
step, which boards did not say before. And an activity that is being opened now says what it is waiting for,
because one stayed at "Getting ready…" for ten seconds in that run and nothing could say why. **Ten files of
browser tests were then run on all seven screens: 491 tests, 467 passed, 24 skipped by design, none failed.** The suite was then 1511 tests: four more, two on each of the two screens that run everything.

The suite is 1507 tests, 36 more than it was. On each of the two screens that run everything, 18: the
room's seventeen (fourteen written, one of them on four sizes of screen) and the globe's turn that the page
stops in the middle of. On each of the other five the count is as it was: the room's one test of layout
came, and the globe's test for an upright phone went from the list. The test of the notch visits the room
on every screen. Before the run, as the work went, the specs it touched were run on the desktop and the
phone more than once, and those runs are not counted here.

**Before that, with Explorer Harbor's globe.** The whole suite was run in one go, in Chromium on all seven
screens, on the tree with the globe in it: **1471 tests, 1231 passed, 240 skipped by design, none failed**
(55.5 minutes). By screen: desktop 416 passed, phone 507, the tablet, the small phone and the phone held
sideways 60 each, and the two Android shapes 64 each.

**Before that, with Inventor Island's shelter.** The whole suite was run in one go, in Chromium on all seven
screens, on the tree with Inventor Island's shelter, record and portfolio in it: **1402 tests, 1181 passed,
221 skipped by design, none failed** (52.7 minutes). By screen: desktop 398 passed, phone 485, the tablet, the
small phone and the phone held sideways 58 each, and the two Android shapes 62 each.

**Before that, with Memory Forest's two later activities.** The whole suite was run in one go, in Chromium on
all seven screens, on the tree with Memory Forest's two later activities in it: **1372 tests, 1151 passed, 220 skipped
by design, and one failed** (51.0 minutes). By screen: desktop 387 passed, phone 476, the tablet, the small
phone and the phone held sideways 56 each, and the two Android shapes 60 each. The 220 skip themselves and say
why: 154 on the desktop, which are measurements made once, as a touch phone, and the tests only Safari's
engine can run; and 66 on the phone, which are the activities played to their ends once, on the desktop, and
the keyboard journeys.

The one that failed was on the desktop: "where to begin: can be any activity of a world, and the beginning
again". **It was a fault in the test, twice over, and the second half of it had been hiding the first since
the test was written.** The test chooses "the beginning" in the grown-ups' area and goes straight to the
world's page, to see that Play goes there. It did not wait for "Saved.", as it does the first time it changes
something, and this once the page was left before the choice had been written down: Play was where it had
been. That is the failure. Why it had never failed before is the other half: a world's page sends Play to the
beginning until it knows who is playing, so "Play goes to the beginning" is true of every world's page for
its first moment, whatever is stored. With the save slowed by four tenths of a second, so that the choice was
certainly never written, **the test as it was passed.**

A world's page now says when it knows who is playing and what they have finished (`data-settled`); the three
tests that expect Play at the beginning wait for that first (`worldSettled`, `e2e/fixtures.ts`); and this one
waits for "Saved." as well. With the same slow save, the test as it is now passes, and with only the wait for
"Saved." taken out it fails, with exactly the failure of the full run.

**After that run** the world's page was changed to say so, those tests were changed to wait, the help test was
made to note every press the page is given (run 48, under _Continuous integration_), and four comments were
corrected to measured numbers. The specs that touch a world's page, the map, the journey in, "how to play",
Memory Forest, the phones and the tests' own tools were then run on all seven screens (`a11y-worlds`,
`journey`, `garden`, `hub`, `howto`, `sizes`, `phones`, `memory`, `smoke`, `begin`): **692 tests, 552 passed, 140 skipped by design, none failed** (17.5 minutes); and `shell`,
`help` and `begin` before them, on the same change: 77 passed, 4 skipped by design. The whole suite was not
run a second time. The unit tests, the build, its checks and the rehearsal of the update are of the final
tree. **WebKit is CI's**, as always.

**Before that, with the first-visit help.** The whole suite was run in one go on the tree with the
first-visit help in it: 1212 tests, 1025 passed, 186 skipped by design and **one failed**, in 42.5 minutes. By
screen: desktop 358 passed, phone 420, the tablet and the small phone 48 each, the two Android shapes 52 each,
and the phone held sideways 47 with the one failure. That one was "how to play" played through at 844×390: at
its last step the page was a pixel taller than the screen. It was a fault in the game and not in the test.
Glim's hand, where it stands on Glim, hung two pixels below the foot of the screen, and how far it hung at the
moment of measuring depended on where it was in its bobbing; on six screens, and on this one in the run
before, it had been caught at a moment when it did not. The hand now stands inside whatever it points at when
that is at the foot of the screen. Looking for it on every screen, with the hand held still at its lowest,
found a second fault the same way: on a phone 360 wide the bell's swing reached 16 pixels past the side of the
screen for most of a second.

After those fixes the tests that touch the first-visit help (`howto`, `help`, `begin`, `journey`, `phones`,
`a11y`, `resilience`) were run again on all seven screens: **133 passed, 3 skipped by design, none failed**
(7.5 minutes). The suite is now 1221 tests: the test that watches "how to play" with the clock held is run on
every screen shape, where it was on two, and there are two more, at 640×256 and 320×568. The unit tests, the
build and its checks in the table are of the final tree. **WebKit is CI's**, as always.

**And after CI had its say.** CI's first run of that tree (run 43, under _Continuous integration_) failed in
Safari's engine on a page of the grown-ups' area that was wider than an iPhone, and one test there needed a
second attempt. Both were looked into and put right. Before the push that carries the fixes, the four files
that touch what changed (`smoke`, `grownups`, `begin`, `a11y`) were run on all seven screens, twice: **71
passed, 1 skipped by design, none failed**, both times; and the smoke tests, with the two new ones of the
guard, once more after the guard's last change: 14 of 14 on the desktop and the phone. The whole suite was not run again on every screen first: it was started on the desktop and the phone as the push went, and what it said is recorded with the next push. What changed is the grown-ups' area and the tests' own guard, whose rule can only have become more forgiving than it was. The suite is now
1225 tests: two more, of the guard that every test runs under, on the desktop and on the phone. Whether the
page now fits an iPhone is for WebKit to say, in CI.

That run, started as the push went, finished clean: **972 tests on the desktop and the phone, 784 passed, 188
skipped by design, none failed** (27.9 minutes). And CI's WebKit said the page fits: run 44, under _Continuous
integration_.

**With Robot Ridge's three later activities.** The suite is 1288 tests: 63 more. The whole suite was run in
one go in Chromium on all seven screens: **1288 tests, 1086 passed, 202 skipped by design, none failed** (48.8
minutes). After that run the tests' own guard was changed (run 45, under _Continuous integration_) and one
test was added that only Safari's engine can run, which makes 1290. The specs in which a request fails, a page is left with something under way, or the guard is itself tested were then run on all seven screens (smoke, the hub, resilience, the voice, the journey, Robot Ridge and "how to play"): **284 tests, 263 passed, 21 skipped by design, none failed** (18.5 minutes). The whole suite was not run a
second time: in Chromium the guard does what it did, by other code, and that code has unit tests of its own.
The unit tests, the build and its checks in the table are of the final tree.

The 186 that were skipped skip themselves, and say why. On the desktop, 124: the 112 measurements of what a
child presses (28 boards on four screens), which are made once, as a touch phone, at screen sizes of their own;
three of the Music Lab's room at sizes of their own, likewise; eight of Robot Ridge's, which are for a touch
screen too small to be a desktop's; and one about a world that is not open, which none is now. On the phone,
62: the 54 activities played to their ends by their content's answers, which are played once, on the desktop
(the other eight are played by working out what is on the screen, in `robot.spec.ts` and `inventor.spec.ts`,
on every screen); seven keyboard journeys, "how to play" from the keyboard among them; and the same one about
a world that is not open.

The tree has 12 browser tests (six, on the desktop and on the phone) and 18 unit tests that the six worlds did
not have. Each of the browser tests was run against the code as it was and failed there; so were the three unit
tests about a page that is the first thing opened. The other unit tests are of things that are new, and had
nothing older to fail against. _What was found after the six worlds went live_, below, says what each is for.

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

### What the Music Lab added to the tests, and what the tests found

- **Keeping time is tested as sums** (`tests/engine/music.test.ts`, 29 tests): taps as numbers beside beats as
  numbers — on the beat; a fifth of a beat out either way; a third of a beat late every time (a slow speaker),
  which is kept; the same distance out, now early and now late, which is not; half speed; double speed; two
  taps on one beat; no taps. And what a tune's shape is, case by case.
- **Every one of the Music Lab's 32 content rules is shown to fire** (`tests/content/musicLabRules.test.ts`),
  and the pack is held to what was promised of it: six activities in the brief's order, far more than ten
  patterns, high and low asked alone only of things that look alike, every beat slow and never asked for
  whole, and no skill that speaks of talent.
- **What is played, and in what order, is tested without a sound** (`tests/game/musicLab.test.tsx`, 31 tests):
  each one who has something to play is lifted while it plays; the whole question is played again for the
  asking; a bird's picture is the same picture whatever it sings; and nothing a singer sings is ever put into
  words on the page.
- **The instruments are tested against a stand-in for the browser's audio** (`tests/app/audio.test.ts`): what
  each is made of, that a click can be put at a moment on the audio's clock and never in the past, how loud
  anything may be, and that the note of the tap that woke the audio is played when it wakes.
- **In a browser** (`e2e/music.spec.ts`, 22 tests; `e2e/sizes.spec.ts`, 54): nothing can be answered until the
  last of a question has sounded, and a tap in the middle of it is not taken for an answer; the beat is kept
  by tapping with a finger and with a mouse, with the sound off, and with every tap a third of a beat late;
  left alone it is not kept and nothing is marked as missed; a tune is made, changed, played over and handed
  in, and one of another shape stays to be changed; and the room to play in has the whole octave, keeps
  nothing on the device, and stops its beat when told to.

**Tests that passed the first time they were run were made to fail**, by taking out the thing they are about:

| Taken out                                                                                                            | The test that then failed                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the hold on answers while a question is still being played                                                           | both browser tests of hearing a question through                                                                                                                        |
| the row that bars stand in                                                                                           | the browser test of the row — on a phone; on a desktop four bars stand in a row regardless, which is why that test now walks on to four bars and is run on every screen |
| the steady lateness taken off the taps                                                                               | two timing tests (one of them only once it was rewritten: at a quarter of a second late the taps were inside the margin anyway, and the test had proved nothing)        |
| counting a second tap on one beat as a tap too many                                                                  | two timing tests                                                                                                                                                        |
| refusing a hammered drum                                                                                             | the test of a beat as a task                                                                                                                                            |
| playing the whole question again when Glim is asked                                                                  | the script test of asking again                                                                                                                                         |
| saying nothing of what a bird sings                                                                                  | the test that reads every picture's words                                                                                                                               |
| the drum only struck once the listening is over, in a demonstration                                                  | the script test of a demonstrated beat                                                                                                                                  |
| answering a tap once, not again when the finger lifts; the first mouse button only; no instrument with the sound off | three tests of the room                                                                                                                                                 |
| the lighthouse set nearer than the far islands on a wide screen                                                      | the layout test of the three names' room                                                                                                                                |
| the sideways layout of a question that is only a sign                                                                | four tests of the size sweep                                                                                                                                            |

**What the tests found that was already live.** Looking at the Music Lab on the narrowest phone held sideways
showed its first activity as a strip twenty pixels high. The fault was not the Music Lab's: a question that is
only a sign kept, sideways, the two rows it has upright as well as its two columns, so the sign and the groups
shared the shallow upper row and the lower one stood empty. **Number Garden's "Which has more?", "Which has
fewer?" and "Are they equal?" have been drawn that way on every phone held sideways since the six worlds went
live**: groups 48 pixels high at 844 by 390, 20 at 640 by 256. Every test of them passed, because a thing 20
pixels high can be tapped. It is fixed for every world, and `e2e/sizes.spec.ts` now measures, on the three
tightest screens, everything a child presses in one activity of each kind of board, eighteen of them. That
sweep found two more, both on the narrowest phone sideways: Memory Forest's cards to pick out were 49 pixels
high (also live; now one row), and the Music Lab's own two tools 48. With those fixed it passes with no
exception written into it.

**And one that the tests had been told to expect.** The map tests said the lighthouse "is scenery: tapping it
goes nowhere", counted six links, and checked each world's picture under a link of the same name. They were
changed to say what is now true — seven links, the lighthouse the way into the Music Lab — and not loosened:
the test that every picture sits under its tap area now asks each link for its place.

### What Number Garden's numerals added to the tests, and what the tests found

- **What a picture stands for is tested as sums** (`tests/engine/numbers.test.ts`, 48 tests): every numeral; a
  staircase with its missing step first, in between and last, going up and going down, and ten ways of writing
  one that is not a staircase; a frame of five and of ten, full, part full and empty, asked how many it holds
  and how many more would fill it; a path counting on and back; a story in which some come, some go, or
  everyone goes; and why each wrong number is tempting.
- **Every rule for the later questions is shown to fire** (`tests/content/numberGardenRules.test.ts`, 24
  tests), and the pack is held to what is said of it: no numeral in any picture of any activity before the
  numerals, nor in the two story activities that are answered with groups; exactly one right answer to every
  question, worked out in the test from the pictures; no question asked twice in an activity; four different
  answers and more than one way of asking in every activity's own questions; and only _Hear a number_ marked
  as needing sound.
- **What is counted, said and lifted, and in what order, is tested without a screen**
  (`tests/game/numberScripts.test.ts`, 37 tests): a group and its numeral counted to the same number of notes;
  nothing counted or named for a child on their own; a wrong numeral counted out and named; zero counted in no
  time and called zero; a story shown from its first moment as it stood before anyone moved; a staircase sung
  with a silence where the gap is, and with a wrong tower's note in it; a path walked with a wrong number on
  the bare stone; a number said again as often as asked, and nothing answerable until it has been.
- **The drawings are tested for what they must not show** (`tests/game/numberPictures.test.tsx`, 38 tests): a
  numeral has no dots unless it is being counted; the gap in a staircase has nothing in it and the page has
  nothing that says how tall it should be; the bare stone has no number; a number that is said is nowhere in
  words. And for what they must: nobody in a story overlaps anybody, in every story from one and one to nine
  and one, and none is drawn under 30 pixels across on a phone 320 pixels wide.
- **When a script's beats arrive** (`tests/game/useScript.test.tsx`, 5 tests then, 9 since run 56): a script that opens with
  something shows it from the first frame; one that opens with a pause is at rest until then; neither moves
  for someone who has asked for less movement.
- **In a browser** (`e2e/numbers.spec.ts`, 12 tests; `e2e/sizes.spec.ts`, five more boards): each kind of
  question is answered wrongly and then rightly, and what it must not give away is looked for on the page
  before and after; a numeral's dots are watched with the clock held, appearing on the wrong numeral, then on
  the right one, and at no other time; a story is watched from its first moment; a number that is said takes
  no answer until it has been said, and again while it is said again; and with the sound off that activity
  says so and asks nothing. All eleven activities are played to their ends, and each is put through the
  automated accessibility checks, by the tests that do that for every activity.

**Tests that passed the first time they were run were made to fail**, by putting back the fault each is about.
Seven failed as they should. **Two did not**, and were tests that proved nothing:

| Put back                                                                   | The test                                                                                                                                                                                      |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| towers to choose from stacked, on a phone                                  | failed, as it should                                                                                                                                                                          |
| the missing tower drawn in the gap from the start                          | failed                                                                                                                                                                                        |
| a numeral showing its dots all the time                                    | failed                                                                                                                                                                                        |
| a number answerable before it has been said                                | failed                                                                                                                                                                                        |
| the bare stone showing its number                                          | failed                                                                                                                                                                                        |
| those who went away counted with those who stayed                          | failed                                                                                                                                                                                        |
| a story drawn already over until its first moment                          | failed (and the unit test of it)                                                                                                                                                              |
| an empty frame filling itself when it is answered with 0                   | **passed.** It looked at the frame as the answer was taken, before the board had got as far as lighting it. It now waits until the frame and its numeral are lit together; then it fails      |
| a story told, coming and going, to someone who has asked for less movement | **passed.** It waited for the story to stand as it ends, which a story being told also does, at the end. It now holds the clock from the first moment and sees that nobody is ever taken away |

**What the build's own checks found.** The whole build went over its size budget for the first time: 2942 kB
where 2900 was allowed, because 142 challenges written out in full are 134 kB. That budget had been raised
twice before for the same reason, which is a budget that does not mean anything. There are now two: the game
itself (everything but the voice and the content: 2427 kB of 2700, a tighter limit than it had) and the
content (516 kB of 900), which is meant to grow and is still fetched one world at a time.

### What Reading Cove's later activities added to the tests, and what the tests found

- **What a picture is, is read in one place and tested there** (`tests/engine/reading.test.ts`, 32 tests): a
  word to rhyme with, a word to clap, a card of one, two or three claps, a sentence, one thing on or in
  another; seventeen ways of writing one that is not well made, each refused; a sentence and the picture it
  tells of as two ways of writing one thing; and what each wrong answer says.
- **Every new rule is shown to fire, and the pack is held to what is said of it**
  (`tests/content/readingCoveRules.test.ts`, 41 tests, 23 of them a pack broken on purpose): one rhyme and no
  more in every rhyme question, worked out from how the words are spelt; beside every rhyme a child is asked
  alone, a word that starts the same; a word to clap of each number of beats, three times over, with every
  card there to choose from; thirteen words to build, each from exactly its own letters; twelve sentences,
  every letter of every word taught, the little words included, and every picture offered one word away from
  what the sentence says or the same two things swapped; nothing in print before the letter lessons, and no
  pair of letters before the fifteen single ones.
- **What is said and shown, and when, is tested without a screen** (`tests/game/readingCove.test.ts`, 34 more
  tests, 51 in all): with support the word to rhyme with is said before each choice and alone once; a word is
  clapped for a child at the moments its recording's marks give, with a clap sounded at each, and alone is only
  said; a card is played with as many claps as it shows; a sentence is read with the finger under each word as
  that word begins, alone not at all, and not after a wrong answer either; a word to build is said slowly with
  support, and in the demonstration each letter goes to its place as its sound comes; and every clip any
  script of any question says is one that is fetched ahead for it. **That last test found a fault**: the word
  fetched ahead for a letter was not the word its script gives it, where the first choice of word was already
  on the table.
- **The drawings are tested for what they must not show** (`tests/game/readingScenes.test.tsx`, 27 tests): no
  clap under a word until it is clapped, and never more than have been; the row of claps starting from one
  place whatever the word, so that where the first stands says nothing; no finger under a sentence that is not
  being read; and for what they must: all twenty-nine pictures of one thing on or in another can be drawn, both
  things are in each, the smaller one is all inside the picture, and a thing in a cup is hidden below the cup's
  near edge.
- **The voice tool's work is tested by what it wrote** (`tests/config/voice.test.ts`, 3 more tests): every clip
  that has several things in it to follow has a mark for each, in order and inside the clip, and no other clip
  has any; the game is given the same marks; and the slow words that begin softly keep their beginning — the
  first sound of "ship", "shop", "sun", "fish" and "fan" lasts 0.15 seconds or more, and each was heard as
  itself.
- **What the voice says can be listened in on** (`tests/app/voice.test.ts`, 3 more tests): each line as it
  begins to play; not a line that was only fetched; not one that could not be said.
- **In a browser** (`e2e/words.spec.ts`, 9 tests; `e2e/sizes.spec.ts`, five more boards on four screens): each
  activity is answered wrongly and then rightly. With the clock held, the claps under a word are watched
  arriving one at a time and leaving none standing; the places for a word's letters are watched lighting first,
  middle, last; the finger under a sentence is watched going from word to word and away. And what the voice
  said is listened to: a word to rhyme with twice with support; nothing clapped, nothing said slowly and no
  sentence read to a child alone, until help is asked for. All six are played to their ends, and each is put
  through the automated accessibility checks, by the tests that do that for every activity.

**A test that used to prove something stopped proving it, and was changed.** "Read the word is not read out to
a child on their own" looked for the slow word's clip among the files the page had asked for, and found none.
Clips are now fetched as a step arrives, so that one a finger moves in time with starts on time; the clip would
have been there, said or not. The test now listens to what the voice says (`listenIn`), and so do the new ones.

**Each test that passed the first time it was run was made to fail**, by putting back the fault it is about:
thirty-seven faults, one at a time.

| Where             | Put back                                                                                      | The test meant for it                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| the drawings (10) | every clap shown at once; claps shown for a word that is only named                           | failed, both                                                                           |
|                   | the row of claps in the middle from the start (so its first clap says how many)               | failed                                                                                 |
|                   | a finger under a sentence at rest                                                             | failed                                                                                 |
|                   | a thing in a cup not hidden by the cup; no way to put a hat on a rat; a cat as large as a mat | failed, all three                                                                      |
|                   | one name for every picture's clip; no tile lifted; a whole sentence on the small card         | failed, all three                                                                      |
| the scripts (11)  | support the same as none, for a rhyme; the choices said again for the asking                  | failed, both                                                                           |
|                   | a word clapped for a child alone; clapped again for the asking; a card one clap short         | failed, all three                                                                      |
|                   | the marks ignored, and everything spread evenly                                               | failed (seven tests)                                                                   |
|                   | a sentence read to a child alone; a word said slowly to a child alone                         | failed, both                                                                           |
|                   | every letter put down at once in the demonstration; a word in print swept, not stepped        | failed, both                                                                           |
|                   | the finger left under the last word of a sentence for an eighth of a second                   | **passed**, and rightly: nothing a child would see, and nothing a test should fail for |
| the voice (3)     | never announced; announced when asked, not when played; announced when fetched                | failed, all three                                                                      |
| in a browser (13) | support the same as none, for a rhyme                                                         | failed                                                                                 |
|                   | claps all at once; a word clapped for a child alone                                           | failed, both                                                                           |
|                   | no place lit; no picture above the places; a word said slowly to a child alone                | failed, all three                                                                      |
|                   | a finger under a sentence at rest; a sentence read to a child alone, and after a wrong answer | failed, all three                                                                      |
|                   | a word in print read out to a child alone, with one letter to a sound and with two            | failed, both                                                                           |
|                   | a sentence on one line on a phone held upright; its pictures one above another                | failed, both                                                                           |

Two of the faults in a browser were first written so that the game no longer built (a variable left unused), and
the tool that runs them printed nothing for those two, which is not the same as a test passing. They were
written again so that the game built, and the tests failed as they should. And one of the browser tests failed
before any fault was put in: it read what the voice had said the instant the way on appeared, which is the
instant the answer is given, before anything has been said. It now waits for the words.

**What looking found that no test would have.** A slow "ship" was heard by the recogniser as "chip". The
synthesiser's account of where a sound begins is late for a sound that starts softly, by up to a tenth of a
second, and the word had been cut there. Words are now cut in the silence before them, and carried by a
sentence that leaves one. All 32 slow words were made again that way: 31 heard as themselves, as before, and
"lip" heard as "lep" in its carrier sentence only, as before.

### What the first-visit help added to the tests, and what the tests found

- **"How to play" is tested without a screen first** (`tests/game/howto.test.ts`, 33 tests): what a move does,
  and that a move which does not belong to the moment changes nothing — a tap on the board while Glim is
  showing, the tick before everything is in its place, the arrow before the thing is done, Glim's hand making
  the child's move. Each showing is played through as data: it ends with the child's turn and nothing done for
  them; it says hello only the first time; it says only lines that have been recorded; no line begins before
  the one before it is over; it takes a few seconds with the sound or without; and what is written at the foot
  is what the recording says, word for word.
- **And then on a screen, with the voice and the clock in the test's hands** (`tests/game/howtoView.test.tsx`,
  8 tests): each line is said when the one before it is over, **including when the voice wakes a moment after
  the page has opened**; where nothing can be heard each line still gets its second and a half; a reminder is
  said once; leaving writes down that the player has been shown and keeps everything else about them, and
  writes nothing for a player who had been shown, or where nobody is playing.
- **Help with the screen** (`tests/game/nudge.test.tsx`, 28 tests): where a tap landed (on something that can be
  pressed, on something waiting its turn, on nothing), read from a page with the things a lesson has on it;
  what is pointed out for each state of a lesson, and never one answer; that misses are counted in a row and
  within a time; and the hook itself with the clock held: three taps bring it, a press ends it and starts the
  count again, it goes after five seconds, it is not carried to the next step, nothing is watched while the
  lesson is paused, the tick is pointed out once, the line is said once for a step, and a line kept back while
  Glim was talking is owed the next time.
- **Where to begin** (`tests/game/placement.test.ts`, 17 tests; `tests/parent/whereToBegin.test.tsx`, 10;
  `tests/game/progress.test.tsx`, 6 more): what is suggested for each thing seen and that nothing is suggested
  for what was looked for and not seen, or for knowing a letter's shape; that the furthest on is taken
  whichever was said first; that every activity a suggestion or a "watch them try" names exists; that what is
  unsaid is not written down at all; and that Play goes from the chosen beginning, comes back to what was
  passed over only when the rest is finished, and begins at the beginning where the place chosen is not an
  activity of that world. The card is rendered over a real repository: what is chosen is kept, a suggestion
  moves nothing until it is taken, **no attempt and no sitting is written whatever is said**, and a save that
  fails is said.
- **A grown-up is helping** (`tests/game/helping.test.ts`, 6; `tests/game/lessonRunner.test.ts`, 2 more;
  `tests/app/components.test.tsx`, 4 more; `tests/ui/modal.test.tsx`, 1 more): off until said, kept when the
  page is loaded again, off in a new visit; every answer given while it is on is written down as helped and
  none counted as the child's own, and the lesson asks at each answer, so it can be switched half-way; the
  switch does nothing on a tap, a click or a hold let go early, and is held to switch off as well.
- **What is kept about a player** (`tests/storage/repository.test.ts`, 6 more, on each of the three ways of
  storing): what was seen, where Play begins and that "how to play" was shown are kept and can be taken away;
  a thing seen that is not on the list, a word that is not one of the two, a world there is not, and "how to
  play" in any state but shown are each refused, and the player is left as they were.
- **In a browser, "how to play"** (`e2e/howto.spec.ts`, 10 tests): a new player is taken there from the front
  door and does each of the three things, with everything they press measured on every screen shape and the
  lines Glim says listened to in order; with the clock held, each showing is watched one moment after another
  (the hand on a thing before the thing happens), nothing answers a tap before Glim has shown it, and the hand
  comes to what there is to tap after a while of nothing; it is passed by with the house and not shown again;
  it **is** shown again to a child whose first visit ended in the middle of it; it is not shown to a child who
  was already playing; it is done with the sound off, with nothing said; and from the keyboard.
- **In a browser, help** (`e2e/help.spec.ts`, 8 tests): three taps on the picture, in a demonstration, in a
  question and after an answer; every answer wears the ring and the button for a hint does not; the words are
  in Glim's bubble; the line is said once nothing else is being said, and once only; **the activity is then
  played to its end and the record is three independent successes**, as if nothing had been pointed out. With
  the clock held: taps a long look apart are not three in a row, a nudge is gone after a few seconds, taps on
  choices that are turned away say to watch, and a thing finished and left has its tick pointed out once. And
  the switch: a tap does nothing, a hold changes it, every answer is then written down as helped (0 right at
  the first try with no help, and "right after a hint, another try or help" in the grown-ups' area), answers
  before and after it was on are still the child's own, it is still on when the page is loaded again and off
  at the next visit, and it can be set on "how to play".
- **In a browser, where to begin** (`e2e/begin.spec.ts`, 4 tests): saying what was seen offers a beginning and
  moves nothing; taking it makes Play the chosen activity; every activity is still on the world's page, none
  marked as done, and the first one still opens; nothing has been written into what the child has shown;
  another world is as it was; it is kept at the next visit; it belongs to one player, and another child on the
  same device begins at the beginning.
- **Accessibility** (`e2e/a11y.spec.ts`, 3 more tests): "how to play" at nine moments, an activity while
  something is pointed out and while a grown-up is helping, the pause sheet with the switch on, and the
  grown-ups' area with a suggestion showing. No violations.
- **Older tests that go in by the front door** were changed to go through "how to play" (the brand-new child's
  journey plays it; the others pass it by), and the notch test now has it too, shown and at the child's turn.

**Each test that passed the first time it was run was made to fail**: eighty-six faults, one at a time, each
written so that the game still builds. Seventy-nine were caught at once by the test meant for them.

| Where                             | Put back (some of them)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | The test meant for it             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| how to play, rules (12)           | a tap counts while Glim is showing; the other picture ends the turn; the tick counts early; Glim makes the child's move; hello said again; a line begun on top of another; an unheard line given no time; the board not cleared for the child's turn                                                                                                                                                                                                                                                                                                                                 | failed, all; **one hung** (below) |
| how to play, screen (7)           | every line's length asked once, as the page opens; leaving writes nothing, or forgets the player's other settings; the reminder said again and again; "shown" written down only on leaving                                                                                                                                                                                                                                                                                                                                                                                           | failed, all                       |
| the nudge (13)                    | a thing waiting its turn counts as pressed; answers pointed out while none can be pressed; misses add up for ever; watched while paused; the nudge stays; the tick pointed out again and again; its line said every time                                                                                                                                                                                                                                                                                                                                                             | failed, all but one (below)       |
| where to begin (11)               | the suggestion is whichever was said last; "not yet" counted as seen; what is unsaid written down; Play ignores the choice; what was passed over never offered; saying it was seen moves the beginning                                                                                                                                                                                                                                                                                                                                                                               | failed, all                       |
| who is new, helping, storage (10) | a child who was already playing is new; one who has been shown is new; the lesson never asks whether a grown-up is helping; helping not kept for the visit; the switch changes at a tap; any word kept for what was seen                                                                                                                                                                                                                                                                                                                                                             | failed, all                       |
| in a browser (33)                 | the front door does not lead to "how to play"; it is shown to a child who was already playing, or written down as shown the moment it opens; Glim's hand is not drawn, or never comes; Glim tapped does not show it again; the nudge picks out one answer; its words are not written; the switch changes at a tap; the lesson is not told; Play ignores the grown-up's choice; where to begin is one player's for everyone; the first activity cannot be entered once Play begins further on; Glim's hand hanging below the foot of the screen; the bell's swing not kept in its box | failed, all but five (below)      |

**The seven that were not caught at once were each a fault in a test**, and each is a way a test can be wrong
that is worth knowing:

1. **A helper that could not give up.** "The board is not cleared for the child's turn" did not fail the unit
   tests: it hung them. A helper played "how to play" forward with `for (;;)` until it reached a step, and with
   the fault it never got anywhere. It now walks the three steps once and says where it stopped; with the fault
   in, eighteen tests fail.
2. **A test that could not tell a press from no press.** "A press does not start the count again" passed: the
   test pressed something only after three misses, when the count had been emptied by the nudge in any case.
   It now presses after two.
3. **A look that came too soon.** "Shown again to someone who passed it by" passed, sometimes. The test looked
   for seven islands and no "how to play" straight after the tap on the front door; the islands are in the page
   behind the door all along, and "how to play" is not in it until a moment after. Every such check now waits
   for the door to have gone and reads the address (`atTheIslands`).
4. **Waiting for something to be absent.** "One tap on nothing is enough" passed. `not.toHaveAttribute` waits
   until it is true, and a nudge goes away by itself after five seconds: the test waited five seconds and was
   satisfied. It now asks once, at the next frame (`nudgeNow`).
5. **A second check in the code.** "A tap counts while Glim is showing" passed in a browser because the board
   also declined to ask. The rules were right and tested; nothing that taps a screen could have shown them
   wrong. The boards now ask whatever the moment and the rules alone decide, and the same fault fails.
6. **Counting what was said before it could be said.** "The nudge's line is said every time" passed: the test
   counted the sayings the instant after the taps, while the first saying was still under way (and a line is
   kept back while anything is being said). It now waits until the first is well over, asks again, and gives a
   second saying time to begin before it counts. Nothing can be waited _for_ there: it is something not
   happening.
7. **Measured at the wrong end of a swing.** "The bell's swing is not kept inside its box" passed. The test
   stopped the bell at the widest of its swing one way and measured the page; but that way is to the left,
   and what reaches past the left of a page does not make the page wider. It now measures at both ends.

**What running the tests found in the game.** The clock-held test of "how to play" passed on the desktop and
failed on the phone's screen: the hand that comes "after a while of nothing" came inside the showing's own
twelve seconds. The showing had been short. It took how long each line lasts as the page opened, which for a
new player is a moment after the tap that wakes the voice, and before the voice is awake; so every line was
given the second and a half of a line nobody hears, and the next line began on top of its last word. Each
beat's wait is now worked out when the beat before it has happened. The test no longer watches for a fixed
time either: a showing is as long as its lines.

Three more came from running everything on every screen, and are told above and here. **Glim's hand hung
below the foot of the screen** on a phone held sideways, by two pixels, so that a page which is one screen
and never scrolls could be scrolled by that much. **The bell's swing reached past the side of a small
phone.** And **"shown" was written down as the page was left**: a test that finished "how to play" and at
once began a new visit found itself shown it all again, because the page had gone before the writing was
done. It is written now as soon as the last of the three things is done, while the page is certainly open.

**What looking found.** The words of a nudge were first drawn as a note over the foot of the screen, and on a
phone the note lay across the very arrow it was pointing at. They are written in Glim's bubble now. And the
recogniser heard "Tap the arrow when you want a turn" as "…when you want to turn"; the line is "Tap the arrow,
and then it is your turn."

### What Robot Ridge's longer plans and its bridge added to the tests, and what the tests found

148 unit tests and 63 browser tests. The unit tests are of the engine (a step that waits, water, a bridge that
is up or down, and every program of up to eight steps tried on two bridges to show that one which arrives with
both up arrives however they stand); of the run as frames (waiting for something is two moments, waiting for
nothing is one); of a row changed from its end and where the robot stands when it is; of the script (a long
row run by Glim a step at a time with one step back, a bridge shown twice over, each line said once and at its
moment); of the rules (every new rule broken by a pack made to break it); of the journeys in the pack (each
long way has one shortest way and rocks that make it long, each bridge is got over however it stands and cannot
be gone round); of the generator of long journeys; and of the second way of finding a shortest way, by walking
the ground, which is held to the engine's own trying of every program on three hundred grounds of every shape.
The browser tests play the three activities as a child would, by working out what to do from what the board
says is on it; watch both demonstrations with the clock held; and measure every board of each on a phone 360
wide and on one 640 by 256.

**What the tests found in the new work.**

- **The picture of an activity was too small to make out.** A test that was there already says that a square
  of ground in an activity's picture on the world's page is at least 20 pixels across on a phone, so that the
  robot in it can be seen. The picture is the activity's first journey, and the bridge's first journey was on
  a ground three rows high: 15.7 pixels. Both demonstrations are now on grounds of two rows (22.6 and 23.3
  pixels), and the generator says why beside each.
- **Two checks that could never fire.** Of 43 faults put back against the unit tests, 41 were caught at once.
  The other two were both in the generator of long journeys: "the way must have two corners" and "the way must
  not begin by turning right round". With either taken out every test passed, and every journey drawn came out
  the same. Neither can fire: a way with fewer than two corners is as short as open ground allows, so the rocks
  would not have made it longer, which is asked for; and turning right round can be done to the left or to the
  right, so there would be two ways as short, which is refused. Both checks are gone, the generator says why
  each follows, and the tests still say both.

**What was wrong with the new tests, found by running them and by putting faults back.** Of 18 faults put back
in a browser, 17 were caught at once by the test meant for them. The eighteenth did not build (it compared a
bridge's state with a word no state can be), which proves nothing; written so that it builds, it was caught.
And three mistakes of the tests' own were found by their first run: a key that says it is waiting cannot be
pressed by Playwright, and the test now taps where the key is, as a finger would; a count of the world's
activities was still four; and a reading of three things in three steps was made one reading before it was
ever run in CI, for the reason told under run 44 below.

| The fault                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Caught by                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A raised bridge can be driven onto; water is ground; a wait lowers a bridge from anywhere; every bridge begins down; the step that waits is read as forward                                                                                                                                                                                                                                                                                                                                                                                                                                                            | the engine's tests of a bridge (2 to 7 each)                                                            |
| Waiting for something is one moment; the robot is drawn waiting with the bridge already down                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | the run's tests                                                                                         |
| A program that works is always shown the bridge up; one that fails is shown it as the journey says                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | the run's tests; and in a browser, the bridge's own test (nothing was seen to wait the second time)     |
| A bridge always lies across                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | two tests, one for each way of telling                                                                  |
| A row is full as soon as it has places; the last step taken out may be help's; the first open step is taken, not the last                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | the tests of a row changed from its end; and in a browser                                               |
| The robot never comes back when its row changes; always goes back to the start; one step too far is counted as shared                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | the tests of where the robot stands; and in a browser (a step put on the end sent it back to the start) |
| A picture's bridges are read as its water; half a square of water is taken                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | the tests of a journey's picture                                                                        |
| Glim never steps back; a longer plan is shown like a short one; the bridge is shown once; a line is said at every bridge, or a step late; which button was pressed is not read; the steps are put in slowly                                                                                                                                                                                                                                                                                                                                                                                                            | the script's tests                                                                                      |
| The script is not told that a row is stepped, or where the robot waits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | the tests of the pack's journeys                                                                        |
| What is written of the bridge is not what is said; how a bridge stands is not said in words                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | the words' tests                                                                                        |
| A long way with two ways as short is let through; a bridge that can be gone round; a bridge taken for a plain plan; a row to mend that is stepped                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | the rules' tests                                                                                        |
| A drawn long way may have two ways as short, or rocks that are not in the way; a map with ragged rows is read                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | the generator's tests                                                                                   |
| Walking the ground does not see a bridge is up; counts one way to the star, or one way to each place                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | the tests that hold it to the engine                                                                    |
| In a browser: a row with places empty is handed in; going back over a run hands it in again; one step on is offered where there is none; the step just carried out is not lit; "go" is ready before the row is full; nothing stirs when there is no room; Glim is shown pressing the wrong button; the bridge is drawn before any run; no dots over a robot that waits; a long row is one line on a phone; what Glim says is not written; the bridge is not in the world page's picture; a screen reader is told nothing of it; the bridge is drawn up whatever the board says; the new activities come before the old | the browser test meant for each                                                                         |

### What Memory Forest's later activities added to the tests, and what the tests found

70 unit tests and 82 browser tests. The unit tests are of the engine: a question that follows another, in a
demonstration, with help at hand and alone, and both asked again when either was missed; a thing kept for the
next sitting, asked last of all, never the one kept the time before, and asked for again only after ten
minutes, as one skill the same day and another on a later day; an answer that carries the way it was looked at
(`tests/engine/plans.test.ts`, `tests/engine/tasks.test.ts`). Of the rules: every new rule of the content's
and of Memory Forest's own is broken by a pack made to break it. Of the lesson's runner: which sitting is the
last one, that a sitting left before its end kept nothing, that a first sitting looks nothing up. Of the
script and the words: Glim looks each way and keeps the first, a wrong answer uncovers nothing, two groups are
said as two groups. Of the list of what each activity is called, which the content build writes. And of
knowing when it is known what a player has finished, which is not the same as their having finished nothing.

The browser tests choose each way and are asked that way's question; look for what is covered, in the page,
and do not find it; give a wrong answer and see it set aside and nothing uncovered; ask for another look and
see the cards turned away; read what was written down, to see that the two questions are counted apart and
that the way is in the answer; watch Glim's showing with the clock held; do it all from a keyboard; finish a
sitting, move the clock on a quarter of an hour, load the page afresh and find the first thing asked is what
was kept; do the same a moment later, and a day later; and measure every board at 640 by 256.

**What the tests found in the new work, and in what was there.**

- **A world's page moved under a finger.** A test of the world pages tapped a card and missed: the card had
  moved. Each card's name came with the world's content, some names take two lines, and every card below
  moved down as they arrived: 15 to 78 pixels, on every world's page, for as long as there have been cards.
  What each activity is called is now in a small list the content build writes, known before the content
  comes, and room is kept for the pictures. A test holds the content back, measures everything on the page,
  lets it through and measures again: nothing may have moved. Measured so on sixteen combinations of world and
  screen: 0 pixels.
- **Things to remember were too small to make out, on three boards.** In two groups on an upright phone, four
  across, each was 71 pixels: the two of a group now stand one above the other. On the narrowest phone held
  sideways the four were 28 pixels, because the board gave them a third of the width as boards do: they have
  the width now, and the three pictures that choose a way a thumb's width each. And five things in one row
  were 33 pixels across on a phone held sideways. Four, in "Things that go together", which is live, are 46
  there and 39 on an iPhone 13 held sideways, measured on the live site. All of it was found by measuring the
  review pictures, after looking at them had not found it. Five or six stand in two rows of three wherever
  that is larger, and four stand two and two on a phone held sideways.
- **Nine cards were 51 pixels wide** at 640 by 256, under the 56 a child's finger is given. Five things are
  picked out from eight cards.
- **A test of where Play goes had passed since it was written, whatever was saved.** It is told under _The
  release check_, above: it left a page before its change was written down, and read the next page before
  that page knew who was playing, at which moment Play goes to the beginning for everyone. A world's page
  now says when it knows who is playing and what they have finished, and the tests that read where Play goes
  wait for it.
- **A check that could never matter.** Of 53 faults put back against the unit tests, 52 were caught at once.
  The other was a line that passed over another activity's sittings when looking for what the last sitting
  kept. With it taken out every test passed, and rightly: a sitting of another activity holds none of this
  one's challenges, so it can have kept none of them. The line is gone, and what follows from what is said
  beside it.
- **The answers a browser test gave were counted against a guess.** The test that plays every activity to
  its end expected at least five answers; the new activity that keeps something asks for four. It now takes
  the number from the activity's own plan, and must match it exactly.

**What was wrong with the new tests, found by putting faults back.** Of 35 faults put back in a browser, 34
were caught by the test meant for them. The one that was not is a rule that keeps room for a second line
under "Play" on a world's page. The note there changes when the page learns what a player has finished, and
no test has such a player on such a page; the rule stays, on reasoning, and `docs/QUALITY_REPORT.md` says it
is not held.

| The fault                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Caught by                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| What follows a question is never asked, or always answered alone; only the first of a pair is asked again, or the second by itself; a pair both missed is asked again twice                                                                                                                                                                                                                                                                                                                         | `plans.test.ts`                        |
| What was kept is asked for however soon; a clock put back is a later day; the two days are swapped; the same thing may be kept twice running; it is asked back after the demonstration; the thing to keep is asked before the closing questions; a re-probe goes after it                                                                                                                                                                                                                           | `plans.test.ts`                        |
| What was kept is read from the first step; no day is taken for today; something unknown is asked about as the first thing kept                                                                                                                                                                                                                                                                                                                                                                      | `plans.test.ts`                        |
| An answer is judged by the first way's answer; the two kinds of slip are swapped; a card the way does not offer is taken; more than a way and a card is taken; it is shown in the last way; only the first way's cards are laid out                                                                                                                                                                                                                                                                 | `tasks.test.ts`                        |
| Let through by the content's rules: an answer that was never looked at; a chain of questions that follow; a thing both looked at and recalled; a thing kept and never asked about; a way offered twice; a card nobody looks at or is offered                                                                                                                                                                                                                                                        | `packs.test.ts`                        |
| What follows, and the thing to keep, are not counted among what is answered alone                                                                                                                                                                                                                                                                                                                                                                                                                   | `packs.test.ts`                        |
| Let through by Memory Forest's rules: two ways, where three are asked; two ways that ask for the same thing; a way that shows other things; a way that offers only things that were there; other things asked for with no hint, or from last time; in groups, the thing itself as its own answer                                                                                                                                                                                                    | `memoryForestRules.test.ts`            |
| The sitting finished first is taken for the last; a sitting left before its end counts as having kept something; a new sitting is not told what day it is; "again" plans without looking up what was kept; the first sitting of all looks nothing up                                                                                                                                                                                                                                                | `lessonRunner.test.ts`                 |
| Another activity's sittings are passed over (**not caught: the line could never matter, and is gone**)                                                                                                                                                                                                                                                                                                                                                                                              | nothing                                |
| The list calls an activity by its id; anything an object has is taken for an activity                                                                                                                                                                                                                                                                                                                                                                                                               | `generated.test.ts`                    |
| Glim keeps the last way and not the first; a way is not named; the question is not said again once the things are put away; another look is never covered again in time; a wrong answer uncovers the things; two groups are said as a plain list; the sign for last time is read as the sign for the start                                                                                                                                                                                          | `memoryForest.test.ts`                 |
| In a browser: the things stay in the page when put away; what will be asked about is shown while they are on show; the answer is written down as the first way; every card is offered whatever the way; another look leaves the cards as they were, or shows the things as they come; a wrong card is not set aside; the card pointed out is the first way's; no way says it is the one chosen; Glim keeps the last way; a wrong answer shows the things; "Ready" is offered before a way is chosen | `memory.spec.ts`                       |
| In a browser: the sign for last time has no words; the runner forgets what was kept; it is asked for a moment later; a later day is asked about as the same day; what follows a question is not asked when the child plays alone                                                                                                                                                                                                                                                                    | `memory.spec.ts`, `everything.spec.ts` |
| In a browser, on phones: the pictures that choose a way are narrower; the things have half the width; the two of a group stand side by side; a thing at a place is no larger; five things in one row upright, or sideways; five two abreast, as four are; the flattest screens given two rows; four in one row sideways                                                                                                                                                                             | `memory.spec.ts`, `sizes.spec.ts`      |
| In a browser, on a world's page: no room is kept for the picture above "Play", or for a card's picture; a card's name comes with the content                                                                                                                                                                                                                                                                                                                                                        | `shell.spec.ts`                        |
| On a world's page: no room is kept for a second line under "Play" (**not caught: said above**)                                                                                                                                                                                                                                                                                                                                                                                                      | nothing                                |
| In the tests' own tool: the clock is not asked again; it is asked fifty times; it is set going again after being held                                                                                                                                                                                                                                                                                                                                                                               | `smoke.spec.ts`                        |
| What is finished is called known from the start; a store that cannot be read leaves the page waiting for ever                                                                                                                                                                                                                                                                                                                                                                                       | `progress.test.tsx`                    |
| In a browser: where Play begins is read from the first player on the device, whoever is playing; a nudge needs four taps (to see the help test say what the page was given)                                                                                                                                                                                                                                                                                                                         | `begin.spec.ts`, `help.spec.ts`        |

### What Inventor Island's shelter, its record and its portfolio added to the tests, and what the tests found

58 unit tests and 30 browser tests. The unit tests are of the model: the shelter held to
set-ups worked out by hand, to its mirror (wind from the other side, prop on the other side, the same
ending), to the directions it claims (a prop on the side away from the wind never makes a wall fall; a taller
wall never stands where a lower one fell), and to refusing a wind, a side or a plant it has never heard of
(`tests/engine/models.test.ts`). Of the picture: where the plant stands, which way a wall falls, which side a
prop is drawn on and where it comes down, how much wind a gust shows, and all of it again in words
(`tests/game/inventorIsland.test.ts`). Of the content's rules: that no one part of a picture gives a guess
away, and that walls are mended with the wind from each side (`tests/content/inventorIslandRules.test.ts`).
Of a grown-up's word: said, said of two things, taken back, and never left behind as an empty record
(`tests/game/placement.test.ts`); kept by all three kinds of storage, and refused when the day is not a day
or the activity is not one (`tests/storage/repository.test.ts`). Of the portfolio: the last thing mended and
not the first, nothing drawn that did not work, guesses counted at the first guess only
(`tests/game/portfolio.test.ts`). And of the audio's listeners, for the reason given under run 49 below
(`tests/app/audio.test.ts`, `tests/app/audioUnlock.test.ts`).

The browser tests watch a wall blow over, measuring the wall and the prop by where their ends are; watch one
stand; mend one and read what was written down; play the new activity to its end by working out what is on
the screen; hold the switch a grown-up holds, find a tap does nothing, find the day kept and the words that
say whose word it is, and take it back; open the portfolio with nothing in it, with a bridge mended, and with
less motion; and look for the portfolio under an iPhone's notch.

**What the tests found in the new work.**

- **The portfolio's pictures were small where there was most room.** Found by measuring the pictures taken
  for review, as the things to remember were in Memory Forest. Five cards were set out "as many as fit", each
  at least 150 pixels wide, on a page at most 920 wide. On a desk that is five in a row with each picture 146
  pixels across and half the page empty under them; on a tablet and on a phone held sideways, four and one.
  The five are now set out for the screen: one row where there is room, three and two, two by two and one,
  one under another on the narrowest phone. Measured before and after, in CSS pixels:

  | Screen    | Before: rows, and each picture | After: rows, and each picture |
  | --------- | ------------------------------ | ----------------------------- |
  | 320×568   | one under another, 280×168     | the same                      |
  | 360×740   | 2+2+1, 147×88                  | the same                      |
  | 390×844   | 2+2+1, 162×97                  | the same                      |
  | 412×915   | 2+2+1, 173×104                 | the same                      |
  | 640×256   | 3+2, 176×106                   | the same                      |
  | 750×342   | **4+1**, 149×89                | 3+2, 209×125                  |
  | 844×390   | **4+1**, 171×103               | 3+2, 239×143                  |
  | 915×412   | 5, 145×87                      | 3+2, 262×157                  |
  | 768×1024  | **4+1**, 153×92                | 3+2, 214×129                  |
  | 1024×768  | 5, 146×87                      | 3+2, 299×179                  |
  | 1366×768  | 5, **146×87**                  | 5, 218×131                    |
  | 1920×1080 | 5, 146×87                      | 5, 218×131                    |

  The test of the portfolio's layout now says which arrangement each width has, and that a picture is at
  least 200 pixels across on a screen 700 wide or more, and 140 on any.

- **The shelter itself was measured too, and is small on the smallest screen.** It is drawn to the same scale
  as the four workbenches that are live, in the same frame, so nothing was changed; the numbers are here
  because they were not known before. In a guess, the picture asked about and each of the two answers; in a
  mend, the picture and each thing there is to press:

  | Screen   | A guess: the picture | its wall (low) | its seedling | each answer | A mend: the picture | its wall | each choice |
  | -------- | -------------------- | -------------- | ------------ | ----------- | ------------------- | -------- | ----------- |
  | 320×568  | 271×125              | 9×35           | 33×21        | 296×107     | 274×218             | 12×47    | 93×64       |
  | 390×844  | 333×221              | 15×57          | 53×34        | 366×184     | 338×517             | 15×57    | 117×93      |
  | 768×1024 | 686×316              | 24×90          | 84×54        | 354×430     | 690×642             | 31×117   | 235×112     |
  | 844×390  | 242×221              | 11×41          | 39×25        | 257×241     | 404×223             | 17×63    | 118×241     |
  | 750×342  | 212×173              | 10×36          | 34×22        | 227×193     | 357×176             | 13×50    | 104×193     |
  | 640×256  | 177×87               | **6×25**       | 23×15        | 192×107     | 278×91              | 7×26     | 96×107      |
  | 1366×768 | 841×209              | 16×59          | 56×36        | 430×293     | 846×418             | 31×118   | 285×92      |

  Everything a child presses is 64 pixels or more each way on every one of them. What is looked at is another
  matter: on the narrowest phone held sideways the wall is 6 pixels by 25 and the prop about 20 long. Looked
  at twice the size, which is how the review pictures are kept, it reads; whether a child reads it at its
  true size on such a phone is not known, and it is as true of the bridge's posts, which are live.

- **A prop "lying flat" was measured as a square.** The first test of a wall that blows over asked for the
  box round the fallen prop to be wider than it is tall. A browser's box round a line that has been turned is
  the box of the line before turning, turned: for a slanting line it is nearly square whichever way the line
  now lies. The test measures a line by where its two ends are on the screen.

- **A test that waited for a picture to be still would have passed with the picture moving.** The portfolio
  plays nothing where motion is reduced. The test tapped, and then waited for the picture to say "after". A
  test that had been played would say "after" too, three seconds later, and the wait would have seen it. It
  asks once, at once, and once more a moment later.

**What was wrong with the new tests, found by putting faults back.** 70 faults were put back, one at a time.
67 were caught at once by the test meant for them. One was caught by nothing (a wind from a side the model
has never heard of was taken for a wind from the left): the model now refuses it, and a test asks. One was
caught only by the linter, which does not run with the tests: the test now asks for a wall propped on the
wrong side with the wind from each side, by name. And one did not build, so nothing ran at all and nothing was
shown: it was written again so that it did, and was caught.

| The fault                                                                                                                                                                                                                                                                                                                                                                                         | Caught by                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| A wall stands alone against twice the push; a prop holds from either side; a wall shelters only what is lower than itself; a tall wall catches no more wind than a low one; a wall that is too low counts as sheltering; the side away from the wind is the side it comes from; a gust pushes no harder than a breeze                                                                             | `models.test.ts`                         |
| Anything is taken for a wind, or for what is behind the wall                                                                                                                                                                                                                                                                                                                                      | `models.test.ts`                         |
| Anything is taken for a side the wind blows from (**not caught at first: a test was added**)                                                                                                                                                                                                                                                                                                      | `models.test.ts`, since                  |
| The plant stands on the side the wind comes from, or where a tall wall would land on it; the wall falls towards the wind; a sunflower is drawn lower than a low wall; a prop is drawn on the other side, or comes down away from the wall; a plant bends right out of the picture; a gust shows no more wind than a breeze; left is said for right; the pole stands on the side the wind blows to | `inventorIsland.test.ts`                 |
| A prop on the windward side is never asked about with the wind from the right; a guess is asked about a wall too low for what is behind it; the answer shown for a mend props the wall on the side the wind comes from; every mend has the wind from the left; no mend starts with a wall that stood and was too low                                                                              | `inventorIslandRules.test.ts`            |
| No mend starts with a prop on the wrong side, for a wind from the left (**caught only by the linter at first: the test was made to ask for it from each side**)                                                                                                                                                                                                                                   | `inventorIslandRules.test.ts`, since     |
| In a browser: the wall falls towards the wind; a wall that blew over is drawn standing afterwards; a prop that held nothing is left leaning on the air; a plant the wind reaches does not bend; the wind is drawn getting through a wall that stood; a prop holds from either side; a prop is drawn leaning away from the wall; the plant stands where the wall lands on it                       | `inventor.spec.ts`                       |
| Every answer to a guess is counted as a guess; a design that did not work is drawn; the first thing mended is kept, not the last; nothing is shown where nothing has been mended; an answer that is no design is drawn as far as it goes; every guess is said to have come true                                                                                                                   | `portfolio.test.ts`                      |
| What is taken back leaves an empty word behind; saying one thing was tried forgets the others; the month is the one after                                                                                                                                                                                                                                                                         | `placement.test.ts`, `portfolio.test.ts` |
| In a browser: a tap changes the switch; said of one activity, it is shown as said of all, on the island's page or in the portfolio; the words say the game saw it; it cannot be taken back; the switch is there when nobody is playing                                                                                                                                                            | `inventor.spec.ts`                       |
| In a browser: a thing that was mended is drawn as it was before it was tested; a tap on it tests nothing; what the child chose is left out of the picture; every empty card leads to the bridge; an empty card is 40 pixels high                                                                                                                                                                  | `inventor.spec.ts`                       |
| In a browser: with less motion the test is played all the same (**did not build at first, so nothing ran: written again**)                                                                                                                                                                                                                                                                        | `inventor.spec.ts`, since                |
| In a browser: the portfolio is drawn under the notch                                                                                                                                                                                                                                                                                                                                              | `phones.spec.ts`                         |
| In a browser: five in a row as soon as the screen is 700 wide; no three in a row; the page as narrow as it was                                                                                                                                                                                                                                                                                    | `inventor.spec.ts`                       |
| The audio's listeners are told in the middle of a press; never told; told once for every press; told once and then never again; the engine tells whatever it was asked; asked to tell, it says nothing; woken quietly, it is not woken                                                                                                                                                            | `audioUnlock.test.ts`, `audio.test.ts`   |
| In a browser, staged: the game tells its listeners inside the press, as it did (**failed 8 times in 8**)                                                                                                                                                                                                                                                                                          | `help.spec.ts`                           |
| In the tests' own guard: it never looks at how long a test took; nearly all of a limit may be used; a test with no limit is said to be near it                                                                                                                                                                                                                                                    | `smoke.spec.ts`                          |

### What Explorer Harbor's globe added to the tests, and what the tests found

133 unit tests and 27 browser tests (twelve of the globe, eight of sizes, the three new lessons each played to its end and each checked for accessibility, and one of the tests' own page limit). The unit tests are of the arithmetic of a globe looked at from
far away (where a place is on the disc, whether it faces, what a land's outline is when part of it has gone
round the edge, how a finger turns it, what a land's shape is by itself: `tests/content/globe.test.ts`); of
the continents' outlines, held to the world by name (51 places that must be on land, in their own continent
and no other; 21 that must be in the sea; the mainland first: `tests/content/atlas.test.ts`); of the
content's nineteen new rules, each with a question that breaks it
(`tests/content/explorerHarborRules.test.ts`); and of the drawings and the words: the fifteen famous places
and their list, the land that is lit drawn last, a pin over its place, what an activity is known by on the
world's page, and that neither the globe's description nor any pin's label names a land
(`tests/game/globePictures.test.tsx`).

The browser tests measure every pin against where the content says its land is, with the globe wherever it
has been turned to; find the three pins and the two turning buttons large enough and clear of one another;
watch the land that is found lit and looked at, and a famous place put where it is; pull the globe with a
finger (a real one, where the browser can be given one) from the middle of a pin, and find the pin not
pressed; flick it and press at once; turn it to the other side of the world, tap where a pin would be, and
wait for it to come back; turn it by its buttons and by the arrow keys; hold the phone the other way; and do
it again where nothing is to move. Both activities are in the size tests on the four smallest screens
(`e2e/sizes.spec.ts`), and all three are played to the end and checked for accessibility with the rest.

**What the tests found in the new work.**

- **A press straight after a flick pressed nothing.** Found by the test of a pull, on the phone, at its first
  run: after the globe had been pulled, a tap on the right pin did nothing. It was tried by hand at eleven
  delays, thirty-three times: a tap made up to 150 milliseconds after a flick ended was lost **twelve times
  in twelve**, and one made 200 milliseconds after or later never, in twenty-one. The page is given the
  finger going down and coming up,
  on the pin; what it is not given is a click. Chromium takes a tap that follows a flick so closely for a
  hand put out to stop a page that is still gliding, and makes nothing of it, though nothing here glides. A
  press on a pin is now taken when the finger comes up on the pin it went down on, without a pull between.
  The click a browser makes of the same press finds the pin already answered with. A click that comes of no
  finger (the keyboard, a screen reader) is a press as it always was. **Only Chromium's touch was tried**:
  whether Safari on a phone does the same is not known, and the fix does not depend on it.

- **The keyboard was left with nothing.** Found by the test of the arrow keys, at its first run. A pin that
  has gone round the back of the world cannot be pressed and cannot hold the keyboard; a browser takes the
  keyboard away from it and gives it to nothing. The next arrow key turned nothing, and Tab would have begun
  again from the top of the page. When the pin that holds the keyboard goes out of sight, the keyboard is
  now handed to the button that turns the globe the way it was last turned, where the next key still works.

- **Russia's far end was Europe.** Found when Europe's shape was drawn by itself and looked wrong. The
  source keeps the part of Russia past 180 degrees as outlines of their own, numbered from -180; cut at "60
  degrees east", they fell on the western side. They are Asia now, and two places past 180 degrees are in the
  list the outlines are held to. With the outlines as they were, those two tests fail.

- **Europe's shape was small in a corner of its own picture.** Found by looking: Svalbard and Franz Josef
  Land, far to the north, set the size of the picture, and the Europe a child would know was small in it.
  A land's shape is now sized by the parts of it that are each a hundredth of the land or more, and of the
  rest only what lies in or near that box is drawn (`shapeOf`). Europe's shape has 10 of its 14 outlines,
  Oceania's 14 of 17 (with New Zealand, without Hawaii) and North America's 40 of 41; the other four lands
  have all of theirs. The globe itself leaves nothing out.

- **The turning buttons stood where a pin can stand.** Found by measuring: with the buttons in the lower
  corners of the globe's square, a pin's place and a button's shared up to 3.9 pixels on two of nine screens.
  The buttons are now never over the globe: at each end of the row under it, or at each side of it.

- **On the narrowest phone held sideways, a pin's place was 48 pixels across.** Found by measuring. Pins had
  to be 0.9 of the ball's radius apart, which on a globe 106 pixels across is 46 pixels: no room for two
  places of 56. They must now be 1.1 apart, which there is 56; all 35 questions were made again and still
  have three pins each (the nearest two are 1.115 apart). What it cost is said in `docs/QUALITY_REPORT.md`:
  lands that are neighbours are no longer asked together.

- **The address of the source was in a file the game ships.** Found by the test that no shipped file names
  another site. The atlas says what it was made from and its checksum; where that is fetched from is in
  `docs/ASSETS.md`.

- **One line of the voice was heard wrongly.** "Uluru is in Oceania. Find Oceania." came back from the
  recogniser as "uruv is in osha 'ania…" after five takes. Tried by itself, in ten wordings of three takes
  each: written "Uluru", the name was heard as "uru", "urul", "bulru" or the like in thirteen takes of
  fifteen; written "Oolooroo" or "Ooloo-roo", as "uluru" in eight of nine. The synthesiser is now given that spelling for that word
  (`SAID_AS`, in `scripts/voice/make_voice.py`); what is shown is the word, and what is heard is still held
  to the word. Both lines with it in are heard as written. **Nobody has listened to any of them.**

**Measured, in CSS pixels, with a question being asked.** Every pin's place and both buttons are 56 or more
on every screen, and no two things to press share any of it.

| Screen   | The board | The globe | What is asked for (each) | A pin's place | A turning button |
| -------- | --------- | --------- | ------------------------ | ------------- | ---------------- |
| 320×568  | 296×372   | 285       | 80                       | 68            | 56               |
| 360×740  | 336×551   | 336       | 96                       | 81            | 56               |
| 390×844  | 366×652   | 366       | 109                      | 88            | 56               |
| 640×256  | 602×107   | 107       | 50                       | 56            | 56               |
| 750×342  | 705×193   | 193       | 91                       | 56            | 56               |
| 844×390  | 796×241   | 241       | 113                      | 58            | 56               |
| 768×1024 | 722×800   | 608       | 176                      | 96            | 56               |
| 1024×768 | 872×549   | 503       | 209                      | 96            | 56               |
| 1366×768 | 872×549   | 503       | 209                      | 96            | 56               |

The first row is the first activity; with a shorter line under it, as the other two have there, the board is
14 pixels taller and the globe 296. On the narrowest phone held sideways the globe is 107 pixels across and
Africa on it about 40. It can be answered on, and every test of it passes; whether a child knows a land by its
shape at that size is not known. It is the little the lesson's frame leaves on a screen 256 pixels high, and
it is as true of the map.

**What was wrong with the new tests, found by putting faults back.** 58 faults were put back, one at a time: 31 in the arithmetic, the rules, the generator and the drawings;
the outlines as they had been; 23 in the board and its styles, in a browser; and three in the tests' own
tools. **53 were caught at once** by the test meant for them. **Four taught something about the fault and
not the test**, and were written again and then caught: one changed nothing (an outline with no point facing
was already drawn as nothing by what came after); one, meant to make the end of a pull a press, pressed
nothing, because a pin on a ball falls behind the finger that pulls it and after a long pull the finger is
no longer on it; one, meant to make pins too small, made them 60 pixels on a desk, which is not small, and
was run on a phone; and one did not build, so that nothing ran. **One was caught by nothing, and the code
was wrong to be there**: a guard against taking one press twice, once as the finger comes up and once at the
click. Without it nothing changed, because the pin is already answered with by the time the click comes
and the lesson takes no second answer while it is busy with the first. The guard was taken out.

| The fault                                                                                                                                                                                                                                                                                                                                                                                                                                     | Caught by                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| East is to the left; the globe tips the wrong way; it may be tipped right over; degrees east are not brought into range; from one view to another the long way round; pulled right, it turns east; an outline is not joined up along the edge, or is joined the longer way; inside is outside; everything is in sight; the middle of several places is not kept within the tip; apart is measured across only; a line is drawn round the back | `globe.test.ts`, one to six tests each; the inside-out one by 75                          |
| Every outline of a land sets the size of its shape; far outlines are drawn in it; a shape has no room round it, or is not in the middle of its box, or is seen from over the equator                                                                                                                                                                                                                                                          | `globe.test.ts`, the five tests of a shape                                                |
| An outline with no point facing is started all the same (**changed nothing: written again** as "what is behind the world is drawn", and caught)                                                                                                                                                                                                                                                                                               | "is cut at the edge of the disc and joined up along it"                                   |
| The outlines as they were, with Russia's far end in Europe                                                                                                                                                                                                                                                                                                                                                                                    | the two places past 180 degrees, and the count of outlines in each shape                  |
| Crowded pins, a pin at the edge, and a wanted land turned away each pass the rules                                                                                                                                                                                                                                                                                                                                                            | that rule's own breaking question                                                         |
| The generator sets pins nearer than is written down; it says a place is in its continent where it should say its country                                                                                                                                                                                                                                                                                                                      | "is the pack its generator writes, to the letter"                                         |
| A pin is called by the name of its land, in the pack                                                                                                                                                                                                                                                                                                                                                                                          | the rules, the lint of the packs, and "gives each pin a label that says where it is"      |
| A pin is put as if the ball filled its picture; the land that is lit is drawn where it comes; the globe is described by the name of the land asked for; a famous place, or a name that is only heard, is a globe on its card; any name an object has is a famous place                                                                                                                                                                        | `globePictures.test.tsx`, the test of each                                                |
| In a browser: a pin is drawn upside down from its place; the land that is found is not lit; the globe does not turn to it; a famous place that is found stays in the middle of its land; a wrong land is not set aside                                                                                                                                                                                                                        | the tests of the lands and of the places                                                  |
| In a browser: a land that is only named shows its shape from the start; help does not bring it                                                                                                                                                                                                                                                                                                                                                | "a land that is only named has nothing to match until help is asked for"                  |
| In a browser: a pin behind the world can still be pressed; turned away by a pull, the globe never comes back; turned away by a button, it never comes back                                                                                                                                                                                                                                                                                    | "turned until a pin is out of sight", and the buttons' and the keys' tests                |
| In a browser: the end of a pull presses the pin it began on (**pressed nothing at first: written again**); the land goes half as far as the finger                                                                                                                                                                                                                                                                                            | "a finger turns it, the pins go with the land, and a pin under the finger is not pressed" |
| In a browser, on the phone: a press waits for the click a browser makes of it                                                                                                                                                                                                                                                                                                                                                                 | "a pin pressed straight after the globe has been flicked is pressed"                      |
| In a browser: a press is taken as the finger comes up and again at the click (**caught by nothing: the guard it removes was not needed, and is gone**)                                                                                                                                                                                                                                                                                        | nothing                                                                                   |
| In a browser: the button to the left turns it to the right; the turning buttons are ringed as answers                                                                                                                                                                                                                                                                                                                                         | "two buttons turn it a step at a time, and they are not answers"                          |
| In a browser: an arrow key on a turning button does nothing; the keyboard is not handed on when its pin goes out of sight                                                                                                                                                                                                                                                                                                                     | "the arrow keys turn it from any pin or button, the keyboard is never left with nothing"  |
| In a browser: where nothing is to move, the globe turns all the same (it was seen in 55 places where it should have been in two)                                                                                                                                                                                                                                                                                                              | "is simply where it should be"                                                            |
| In a browser: pins as large on the smallest globe as on any (they overlap); pins too small for a finger (**no fault on a desk, where they came out at 60 pixels: run on the phone**)                                                                                                                                                                                                                                                          | the flattest phone's test; the first test of the lands, as a phone                        |
| In a browser, on the phone: sideways, the globe is laid out as it is upright; the turning buttons stand over the globe's lower corners                                                                                                                                                                                                                                                                                                        | "held the other way, the globe and its pins are laid out again and are still right"       |
| In the tests' own tools: a page is waited for as long as its test has (**did not build at first: written again**); a numeral shows its dots all the time; the snails are never said to be being counted                                                                                                                                                                                                                                       | the page limit's test, after 2.2 minutes; the mended numbers test                         |

### What Explorer Harbor's room for making a story added to the tests, and what the tests found

42 unit tests and 17 browser tests on each of the two screens that run everything (fourteen written, one of
them on four sizes of screen), with one of them on each of the other five and the room added to the test of
the notch. The unit tests are of what a story can be (`tests/content/storymaker.test.ts`: the five turns,
what is offered at each, every way through walked from nothing chosen to the last page, the lines every page
is told with, and that the lines the voice was made from are the lines the game shows, to the letter); of
what is shown and said after each choice, as scripts, with a voice and with none
(`tests/game/storyTelling.test.ts`: at every one of the 139 stages a story can be at, nothing is offered to
choose from while a page is being told, and something that can be acted on is always said last); and of the
pictures (`tests/game/storyPictures.test.tsx`: all 216 pages drawn, the one it is about glad, then not, then
glad, and no two things a child chooses between drawn alike).

The browser tests make a story by five taps and listen to every line of it in order; make all 24 stories
there are for one of the three, holding what is offered at each turn to the content; watch a leaf turn going
on and going back; hold the clock and watch a page being told, with nothing to choose from and its room
kept; tap Glim at a question and in the middle of a telling; turn to a page by its small page; make a story
with the sound off, switch the sound on and off again; make one where nothing is to move, and one from the
keyboard; find nothing stored afterwards; measure everything that can be pressed, and the book itself at
every turn of the story with the most words, on the four smallest screens; run the accessibility checks at
three moments; and hold the switch on the harbour's page that says a story was told back.

**What the tests found in the new work.**

- **Glim's button lay over the first picture to choose, by 1.3 points, on the flattest phone.** Found by the
  size test at its first run (640 by 256). The button was seven points taller than Glim, because Glim was a
  piece of a line of text inside it and a line has its own height. Glim is a block there now.
- **The two buttons at the end were 170 points tall on a narrow phone**, and the book 24 points smaller for
  it. Found by measuring every part of the room at every turn. They had been given the columns the pictures
  have, and their words broke over three lines. Each is now as wide as its own word, and the words were
  shortened to "Again" and "New story" (the buttons are still called "Hear it again" and "A new story").
- **The book changed size from one turn to the next on a narrow phone**: 159 points tall while a story was
  made and 151 at its end, because what Glim says grew from two lines to three. Room for three is kept from
  the start. **The first try at that did nothing**: the rule for narrow phones stood in the stylesheet above
  the rule it changes. A check added to the size test, that the book is where it was and the size it was
  after every choice, failed and said so.
- **Switched on at the end, the sound told the whole story over again.** Found when the test of the sound
  switch was changed to wait a moment longer. The room plays again whatever it played last when the sound
  comes on, so that a question put before the first touch is heard after it; at the end of a silent
  retelling, that was the retelling. The switch now has the room say where the story has got to, and
  nothing more.
- **On the harbour's page, the words for grown-ups were one letter wide.** Found by looking at a picture of
  the page, and by no test: nothing overflowed and nothing was hidden. The switch that says a story was told
  back asked for a second column, as the same switch has in the list above it; the section then had two, and
  every other thing in it (a heading, a paragraph) was put in the one with no width. Under a room's note the
  switch now has the section's one column, and the test of the switch measures every part of that section.
  **The first check written for it passed with the fault put back**: it measured three paragraphs, and they
  were three that had landed in the wide column. It measures them all now.
- **A recording ran over the seven seconds a line is allowed** (7.16), and a second was within a twentieth
  of a second of it. Found by the test of the voice's files. Both lines were made shorter.
- **A shorter closing line was heard wrongly.** "…Hear it again, or make a new one." came back from the
  recogniser as "…hear it again, we'll make a new one" in five takes of five. The line went back to the
  wording it hears rightly, and the room it needed was found another way (above).

**Measured, in CSS pixels**, with the story that has the most words, at each of its six moments. The book is
the same size at all six on every screen.

| Screen   | The book | A picture, of three | A picture, of two | A small page | Glim's button | The two at the end |
| -------- | -------- | ------------------- | ----------------- | ------------ | ------------- | ------------------ |
| 320×568  | 214×146  | 93×63               | 134×91            | 82×56        | 83×71         | 111×56 and 143×56  |
| 360×740  | 336×228  | 106×72              | 164×111           | 82×56        | 83×71         | 111×56 and 143×56  |
| 390×844  | 366×249  | 116×79              | 178×121           | 82×56        | 83×71         | 111×56 and 143×56  |
| 640×256  | 271×184  | 86×58               | 90×61             | 82×56        | 72×62         | 107×56 and 139×56  |
| 750×342  | 306×208  | 102×69              | 121×82            | 82×56        | 72×62         | 107×56 and 139×56  |
| 844×390  | 377×256  | 116×79              | 138×94            | 82×56        | 72×62         | 107×56 and 139×56  |
| 768×1024 | 674×458  | 214×146             | 221×150           | 82×56        | 83×71         | 111×56 and 143×56  |
| 1024×768 | 484×329  | 181×123             | 181×123           | 82×56        | 83×71         | 111×56 and 143×56  |
| 1366×768 | 484×329  | 181×123             | 181×123           | 82×56        | 83×71         | 111×56 and 143×56  |

Nothing that can be pressed is under 56 in either direction, and no two share any of the screen. On the
narrowest phone upright the page is 214 across, which is the smallest the book is anywhere. On a desk it is
484 where there is room for twice that: the room is laid out as it is on a tablet and does not grow.

**What was wrong with the new tests, found by putting faults back.** 78 faults were put back, one at a
time: 46 against the unit tests and 32 in a browser. **72 were caught at once** by the test meant for them.
The other six each taught something.

- **One was not a fault.** Meant to make two endings one picture, it moved an animal a little to the right.
  Written again, as every ending drawn as the first of its two, it was caught.
- **Four found a test weaker than its name.** A bear drawn as a fox was still "different from the fox",
  because the pictures were compared with their labels on, and one said bear: they are compared now by what
  is drawn. "Keeps the room for what will be offered" measured that room before a page was told and after,
  when the pictures were in it both times, and never while it was empty: it is measured then now. And "tells
  the whole story again from the first" asked which page the book was at after the telling had been
  announced, by which time a book that had begun at its last page had turned to its first: the page is now
  written down in the page itself at the moment each line begins. And the check that the words for
  grown-ups are as wide as their part of the page measured three paragraphs, which were three that had
  landed in the column that was wide: it measures every part now.
- **One found a rule that was not needed.** On the flattest phone Glim had been made smaller, to cure the
  1.3 points by which its button lay over a picture. Taken out, nothing failed: making Glim a block, done at
  the same time, had cured it already. The rule is gone, and that fault (Glim as a piece of a line of text)
  is caught.

| The fault                                                                                                                                                                                                                                                                                                                                                          | Caught by                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| The turns are taken from the last; every beginning is offered in every place; the endings offered are those of the first trouble; a page is made when the place is chosen; the last page does not say it ended well; everyone is Fox at the end; what they want is asked as who it is about; a trouble is called by its beginning; not every way through is walked | `storymaker.test.ts`, one to eight tests each (and the tests of the telling and the pictures beside) |
| In the content: a line calls someone he; a way through has one ending; an ending is a telling-off; a line is too long to say in a breath or two; two choices at a turn are called alike; the game words a line differently from the voice                                                                                                                          | the test of each, and "are what the voice was made from, to the letter"                              |
| The page a choice made is not turned to; the fourth choice is taken to make the first page again; what there is to choose from is offered while the page is told; the first line does not wait for the page to turn; it does not play where less motion is asked for; a whole story is followed by nothing                                                         | `storyTelling.test.ts`, the test of each; the third by the test of all 139 stages                    |
| Told again: it does not say that it will be; it is announced over the last page, or before the page has turned; the pages come in the wrong order; in silence they go by as fast as they turn; aloud each waits as if nothing were heard                                                                                                                           | the three tests of a whole story told again                                                          |
| A page asked for is left as if the story were at its end; any page number is a page of the book; a book can lie open at no page; the question again tells the page again; the lines of the pages are not fetched ahead                                                                                                                                             | the test of each                                                                                     |
| Whoever it is about is glad on every page; the second page is the first over again; an ending has no scene; the place is not drawn; a page not reached is drawn as the beginning; any name an object has is a beginning; a word is written in a picture; someone on a blank page has the beach round them; a picture is read out by a screen reader                | `storyPictures.test.tsx`, the test of each                                                           |
| Every ending is drawn as the first of its two (**first written as something that was no fault**); the bear is drawn as the fox (**caught by nothing at first: the pictures were compared by their labels**); the forest is drawn as the garden; what they want is not drawn on the first page                                                                      | "are all different pictures", "are different for each of the three", "shows each of the three"       |
| Explorer Harbor has no room                                                                                                                                                                                                                                                                                                                                        | the router's test; in a browser, every test of the room                                              |
| In a browser: a choice is drawn without what was chosen before; a picture to choose has no name; a page is not told when it is made                                                                                                                                                                                                                                | "is made by five taps on pictures"; the accessibility checks                                         |
| In a browser: every beginning is offered in every place                                                                                                                                                                                                                                                                                                            | "offers what the content says at every turn, and every way through comes to an end"                  |
| In a browser: choices are offered while a page is being told; the line being said is not marked; the room for what will be offered is not kept (**caught by nothing at first: the room was measured only when it was full**)                                                                                                                                       | "takes no choice while a page is being told"                                                         |
| In a browser: Glim, tapped at a question, tells the page again; Glim, tapped while a page is told, only asks the question                                                                                                                                                                                                                                          | the two tests of Glim                                                                                |
| In a browser: the small pages can be pressed before the story is whole; a small page pressed tells the whole story; the first page is not among them until it is whole                                                                                                                                                                                             | "has three small pages"                                                                              |
| In a browser: no leaf turns back; no leaf turns at all; told again, it is announced over the last page (**caught by nothing at first: the page was asked for too late**)                                                                                                                                                                                           | "turns a page with a leaf, going on and going back"                                                  |
| In a browser: a leaf turns where nothing is to move                                                                                                                                                                                                                                                                                                                | "no leaf turns: the page is simply the next one"                                                     |
| In a browser: the sound switch switches nothing; switched on, the room tells over again what it told in silence; with the sound off the question is not written down either                                                                                                                                                                                        | "works with the sound off"                                                                           |
| In a browser: the keyboard is not handed on when the choices change; a new story begins with the old one                                                                                                                                                                                                                                                           | "can be made from the keyboard"                                                                      |
| In a browser: a choice is written down on the device                                                                                                                                                                                                                                                                                                               | "keeps nothing"                                                                                      |
| In a browser, on the phone: the pictures to choose from are small on the flattest phone; Glim is a piece of a line of text there, and its button seven points taller; the foot keeps no room for three lines on a narrow phone; the two end buttons have the columns the pictures have                                                                             | the size tests on 640 by 256 and 320 by 568, the last two by the book having moved                   |
| In a browser, on the phone: Glim is as small on the flattest phone as it was made (**caught by nothing: the rule was not needed, and is gone**)                                                                                                                                                                                                                    | nothing                                                                                              |
| In a browser, on the phone: the room goes up under a notch                                                                                                                                                                                                                                                                                                         | "every screen keeps what a child sees and presses clear of the notch"                                |
| On the harbour's page: there is no switch for a story told back; the switch says it was tried; the switch asks for a second column (**the first check for it passed with the fault back: it measured three paragraphs that had landed in the wide column**)                                                                                                        | "is a switch they hold to say a story was told back"                                                 |

### What phase 12 added to the tests, and what the tests found

273 unit tests (254 in seventeen new files, 19 in five that were there) and six browser tests in a new file,
`e2e/next.spec.ts`, with one more for the shelter; the suite is 1535 tests in 29 files.

**The unit tests** are of days as arithmetic (`tests/engine/days.test.ts`: every day from 1900 to 2200 there
and back against the platform's own calendar, leap years, the ends of months and years); of when a skill
comes back (`review.test.ts`: every wait, what trouble does to it, a calendar that has moved, and five
properties of any record, among them that nothing is due on a day it was practised and that answers with
help never make a thing count as done alone); of luck (`chance.test.ts`: the chance of every one of the 823
challenges, by its kind, and what each number of choices asks of a run before "independent" is said); of the
concept graph and its audit (`graph.test.ts`, with a fault of every kind the audit knows put into a small
graph; `tests/content/concepts.test.ts`, which holds the file to the packs and names the skills that fall
short of what the brief asks); of the choice itself (`recommend.test.ts`, 56 tests on a small curriculum made
for them, and five properties of any record: there is always something to play in every world and it says
why, what is new has not been finished and what was played before has, the answer is the same in whatever
order the record comes); of the five made-up learners (`learners.test.ts`); of the mark on a game of pairs
and of bringing old data up to date (`clean.test.ts`, `tests/storage/pairsMark.test.ts`, and four properties
of whatever was stored in `tests/storage/properties.test.ts`); of the shelter's wall with no prop
(`designNone.test.ts`); of the hook that asks for the choice (`tests/game/advice.test.tsx`: not said until it
is known, never one player's for another, said to be nothing where it cannot be had); of a sitting's clock
and the clock an answer is timed by (`sitting.test.tsx`, `playClock.test.tsx`); of every reason in words and
of the grown-ups' card (`tests/parent/why.test.ts`, `nextUp.test.tsx`); and of what finds a seed for a
browser test (`tests/config/e2eSittings.test.ts`).

**The browser tests** finish an activity and find something new offered that day; move the page's clock on
two days, load the page again, and find the first activity offered again with the page saying so, Glim
pointing at its world, and the grown-ups' card giving the activity, its label, and each reason with the skill
by its name; find a page with nobody playing going by the plain order and saying that it does; give a player
a sitting of ten minutes, play nine and find Play still offered, play two more and find the end of the
activity saying it is a good moment to stop, Glim asleep on the map and pointing at nothing, a world's page
with no big button and every activity still there and still opening, and, with that page simply left open
for half an hour, Play offered again with nothing pressed and Glim awake on the map; play forty-five minutes with no length chosen and find nothing resting; play _Find the pairs_ to
its end turning the same two cards over seven times on every board done alone, and read from what is stored
that each such game is right and marked, that the activity's own count and the grown-ups' page agree, and
that the page no longer says "independent"; and pause an activity for five minutes with a question on the
screen, answer it, and read from what is stored that the answer took more than three seconds and less than a
minute. The two with `@layout` in their names run on all seven screens and measure that nothing runs off the
side.

**What the tests found in the new work.**

- **In the built game, the grown-ups' card could not say what Play would offer.** Found by the first browser
  test at its first run against the build, and by nothing else: every unit test passed. The page's own
  diagnostics said `Cannot read properties of undefined (reading 'provisional')`. Two of the files the build
  is cut into each imported the other (the part of the engine that runs a lesson, and a file that had gathered
  up the seeded dice with the part that chooses what to offer), and a browser starts such a pair in whichever
  order the page asks for them. On the map and on a world's page that order was the lucky one. On the
  grown-ups' page it was not: the part that chooses built its table of numbers from a constant of the other
  file that had not been made yet. The part that chooses now has a file of its own, the engine's modules are
  declared free of start-up side effects, and `npm run verify:dist` has a check that no two built files wait
  for each other. **That check was shown failing** on the build as it had been configured: "engine-play-…
  waits for engine-… waits for engine-play-…".
- **Two copies of one rule.** A fault put into the rule for "is it time to rest" (ten minutes taken where no
  length is chosen) was caught by the unit tests and by no browser test: the game did not go by that rule. It
  went by a second copy, written in whole minutes, beside it. The game now asks the one rule, and the same
  fault fails the browser test "with no length chosen, nothing rests however long is played".
- **A rule that was wrong, not a test that was weak.** A fault put into what is "taken on a grown-up's word"
  was not caught, and writing the test that should catch it showed the rule itself was mistaken: it went by
  where a skill is first taught, and a skill that is taught again further on was then never taken on their
  word, so a place a grown-up chose could be passed over for an earlier activity. It goes by what is taught
  before the activity in question. Two tests hold it, and a test of the content as it stands tries every
  activity of every world as the place chosen.
- **A page left open kept Glim asleep.** Found by reading the code again, and by no test: the browser test
  loaded the page again before it looked, and a page that is loaded again asks afresh. A sitting ends by
  itself, half an hour after the last of the play, and nothing is written then; the page was told only when
  time was added. It looks again now when it comes back into sight, and once a minute while it is there. The
  browser test leaves the page open and loads nothing, and fails without the looking ("Expected: 0,
  Received: 1" of the sleeping Glim).
- **Two changes made quickly, and only the second kept.** Found by the first test of the sitting's length,
  which changes it straight after choosing where Play begins: each change started from the settings as the
  card had last drawn them, so the second saved over the first. Each is now made to the settings as they
  will be once the one before has been saved.
- **A game of pairs in fifteen turns stored as done alone, and a wall with no prop that could not be
  tested.** Both live; both found by the made-up learner who taps without looking, the first as a skill that
  learner should never have been called independent at, the second as a sitting that could not be finished
  by answering at random. Both are in _The update, rehearsed_ and `docs/QUALITY_REPORT.md`.
- **An answer said to have taken five minutes.** Found by reading the brief again ("duration bounded by
  pause"), and then by the browser test written for it, with the mend taken out: "Expected: < 60000,
  Received: 303200".
- **"Independent across days" said too easily of a learner who only taps.** Found by measuring, not by a
  test failing: forty made-up months read by five settings (`docs/QUALITY_REPORT.md` has the table). The
  setting was changed, and the tests of what each number of choices asks for were rewritten to hold both
  sides of the new line: with two pictures, seven in a row is not enough and eight is.

**The tests were made to fail before they were believed.** Against the unit tests, 185 faults were put into
the code one at a time:

| What the faults were put into                               | Faults | Caught at once | The rest                                                                                                                                          |
| ----------------------------------------------------------- | ------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Days, and when a skill comes back                           | 15     | 15             |                                                                                                                                                   |
| Luck, and what it asks of a run                             | 14     | 14             |                                                                                                                                                   |
| The choice, and the concept graph                           | 60     | 47             | 13 not caught: tests added or strengthened until each was; one showed the rule was wrong (above)                                                  |
| The rule for what is taken on a grown-up's word, as changed | 9      | 9              |                                                                                                                                                   |
| The hook that asks for the choice                           | 11     | 11             |                                                                                                                                                   |
| Reasons in words, the grown-ups' card, the list of skills   | 21     | 20             | 1 stopped by the type check before any test ran                                                                                                   |
| The mark on pairs, and bringing old data up to date         | 7      | 7              |                                                                                                                                                   |
| A sitting's clock, and the rule for when to rest            | 15     | 14             | 1 not caught at first (a count below nothing believed): the test's data was dated so that only that could fail it                                 |
| A page that looks again when a sitting has ended by itself  | 9      | 8              | 1 not caught at first (the look coming once an hour): the test took the length of the wait from the code, and says a minute by its own number now |
| The two numbers for luck                                    | 7      | 7              |                                                                                                                                                   |
| The clock an answer is timed by                             | 9      | 9              |                                                                                                                                                   |
| What finds a seed for a browser test                        | 8      | 8              |                                                                                                                                                   |

And seventeen were put into the game and built, against the browser tests: Play going by the plain order
whatever is advised; Glim's hand doing the same; nothing ever falling due; a skill named by its code on the
grown-ups' card; the card's reasons not marked; the time played never added up; a sitting that never ends by
staying away; ten minutes taken where no length is chosen; an activity still marked as next while Glim
rests; Glim still pointing while resting; the end of an activity never saying it is time to stop; pairs in
any number of turns counted as done alone; a page with nobody playing saying it offers something new; and,
for the answer's clock, not stopped when the activity is paused, the page's own clock used, and stopped all
the time; and a page left open never looking again. **Sixteen were caught at once**, each by the test meant for it and in its own words. The one that
was not is the two copies of one rule, above.

## Continuous integration

Every push to a pull request, and to `main`, runs thirteen jobs (`.github/workflows/ci.yml`): lint, types, unit
tests and build; the browser tests in Chromium on seven screen shapes, dealt out between seven jobs; and the
browser tests in WebKit on five, between five. The machine they run on has four processor cores and no
graphics card, and runs two tests at a time. (Until the six worlds there was one job for each engine. The
jobs have been divided as the suite grew, each time one came near its forty-minute limit, and once after one
reached it: run 46, below. They are dealt out by screen now, since run 48. A job's forty minutes also have to
cover putting the browser and what it needs on the machine, which is usually half a minute and has taken
seventeen.)

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
   own text). **That reading was wrong**, and the same test failed for the same sentence twice more: the
   sentence is not a second report of a cancelled download. Run 45, below, has what it is.
4. **As an iPad, a page that never came.** "The page does not bounce, reload when pulled down, or zoom on two
   quick taps" asked for the home page at its first line and waited the whole minute; at its second attempt
   the page came in two seconds. This was the third time (the first two are under Phase 03, below), and the
   first since tests began to say what they were waiting for: "the last page asked for had not been read yet; 1
   unanswered: document / (asked for 60.0 s before)". So it was the page itself, asked for and never answered.
   In that same minute the other worker's tests loaded pages from the same server as usual. By the order of the
   log, the test that had its browser before it was Memory Forest's order game, which had passed. **Not explained.** What was added is
   the server's side: the preview server notes each page as it is asked for and again when it has answered,
   and a test that runs out of time waiting for a page reads the notes and says whether its request arrived,
   and which test had its browser before. Tried here with a page made never to come: "…1 unanswered: document
   /never (asked for 10.9 s before; no request for /never reached the server after that); the test that had the
   browser before this one: [desktop] the one before".

**On the pull request with the fixes** (run 31, `fe0773b`, 2026-11-25): all five jobs passed.

| Job                            | Result                                                   | Time for the tests |
| ------------------------------ | -------------------------------------------------------- | ------------------ |
| Lint, types, unit tests, build | passed                                                   | 1.3 minutes in all |
| Chromium, desktop and tablets  | 337 passed, 9 skipped                                    | 31.7 minutes       |
| Chromium, phones               | 284 passed, 38 skipped                                   | 20.1 minutes       |
| WebKit, desktop and tablet     | 233 passed, 53 skipped                                   | 14.9 minutes       |
| WebKit, phones                 | 269 passed, 52 skipped, **1 more at its second attempt** | 18.2 minutes       |

It was the first time the fixes had run in WebKit. The WebKit job that had retried four tests on `main` retried
none. One run cannot prove that a fault which depended on timing is gone, and that is not what is claimed. What
can be said is that two of the four no longer depend on timing at all: the order game's cards stay closed until
the showing is over, so a test's taps wait for it; and the button to take one back is the same button
throughout. Whether the third arose in this run — WebKit's second report of a cancelled download — is not
known, because the rule lets it pass without a word when it does.

**The one that needed a second attempt was the page that never comes, for the fourth time**, and this time with
the server's side of it. As the plain WebKit phone, "Memory Forest: its front door" asked for the world's page
at its first line and waited the whole minute:

```text
out of time: the last page asked for had not been read yet; 1 unanswered: document /world/memory-forest
(asked for 59.8 s before; requests for /world/memory-forest that reached the server after that: at +-0.0 s
from Macintosh, answered in 0 ms; at +45.6 s from Macintosh, answered in 1 ms; at +47.8 s …; and 1 more);
the test that had the browser before this one: [webkit-phone] accessibility, world by world › Reading Cove:
its front door
```

**The request reached the server at once, and the server answered it in under a millisecond.** (The six later
requests are the other worker's six tests of Memory Forest's activities, which began 45 seconds on; the first
is this page's own.) The page was sent, and the browser never read it: not its beginning, and none of its
files was asked for. That puts the fault on the browser's side of the connection — WebKit as Playwright drives
it on Linux — before any of the game has been taken in, and it clears the preview server, which the first
three occurrences could not. It does not say why. The four have nothing in common that can be seen but WebKit
and being a test's first page: four tests, four screens, each after a different test. CI's second attempt, in
a new browser, has passed every time. A test it happens to will now also say whether the browser had so much
as the start of an answer, and what address the page stood at when time ran out.

**The time.** The Chromium job for the desktop and tablets took 31.7 of the 40 minutes it is allowed, five more
than on `main`: on every screen, an activity that shows something first can no longer be answered early. The
desktop screen is two thirds of that job by itself, so the two small phones were moved to the other Chromium
job (`.github/workflows/ci.yml`).

**On the commit that moved them** (run 32, `4dd5ba9`): all five jobs passed, and no test needed a second attempt
in any of them.

| Job                             | Result                 | Time for the tests |
| ------------------------------- | ---------------------- | ------------------ |
| Lint, types, unit tests, build  | passed                 | 1.3 minutes in all |
| Chromium, desktop and tablet    | 273 passed, 9 skipped  | 19.9 minutes       |
| Chromium, phones (five screens) | 348 passed, 38 skipped | 25.0 minutes       |
| WebKit, desktop and tablet      | 233 passed, 53 skipped | 14.8 minutes       |
| WebKit, phones                  | 270 passed, 52 skipped | 19.7 minutes       |

That is 621 passed and 47 skipped in Chromium, as in the local run, and 503 passed and 105 skipped in WebKit.
The page that never comes did not happen in this run, which says nothing about the next one.

**Three runs since**, all green in all five jobs, and in none did a test need a second attempt (each job's
artifact is under 1.1 MB; a retried test leaves a trace of tens of megabytes):

| Run | What                                                         | Chromium, desktop and tablet | Chromium, phones | WebKit, desktop and tablet | WebKit, phones   |
| --- | ------------------------------------------------------------ | ---------------------------- | ---------------- | -------------------------- | ---------------- |
| 33  | pull request #7, its last commit (`df682f9`), documents only | passed                       | passed           | passed                     | passed           |
| 34  | `main` after the owner merged pull request #7 (`71d66e0`)    | 19.7 minutes                 | 27.5 minutes     | 14.4 minutes               | 18.9 minutes     |
| 35  | pull request #8, its first commit (`4f906f4`): the Music Lab | 29.2 minutes for the job     | 26.6 for the job | 15.5 for the job           | 23.3 for the job |

Run 35 is the Music Lab's activities and its first seventeen browser tests, in Chromium and in WebKit: what
WebKit makes of pitched oscillators, of a click put on the audio's clock and of a tap timed against it, passed
there. (It is still not Safari on an iPhone, and nothing was heard.)

**The time, again.** The desktop job went from 19.7 minutes to 29.2 with the Music Lab in it: the desktop is
the screen every activity is played to its end on, and a question that is listened to takes as long as it
takes to hear. So that job is now two (`--shard=1/2`, `--shard=2/2`), each with half the tests of the desktop
and the tablet. What those two take is for the next run to say.

**Two runs after that, and both had something to say.**

| Run | What                                                           | Chromium, desktop and tablet     | Chromium, phones         | WebKit, desktop and tablet | WebKit, phones                   |
| --- | -------------------------------------------------------------- | -------------------------------- | ------------------------ | -------------------------- | -------------------------------- |
| 36  | `main` after the owner merged pull request #8 (`765be14`)      | 25.9 minutes                     | 30.7, **one test twice** | 14.3 minutes               | 19.4 minutes                     |
| 37  | pull request #9, its first push (`0757f63`): the room, the fix | 15.5 and 11.3 for the two halves | 32.5 for the job         | 15.9 for the job           | **failed**: one test, both times |

_Run 36 was green, and one test in it had needed its second attempt_ (an artifact of 5.5 MB among three under
1 MB): on the phone, in the grown-ups' area, "players can be added, switched, changed and removed". At its
first attempt it pressed "Cancel" in the dialog for adding a player, pressed "Add a player", and waited a
minute for a dialog that was not there. **That was a fault in the game, and it has been in it since Phase 01.** A browser's `<dialog>` says that it has closed a moment after it closes. The game took that word as a
wish to close the dialog; if the dialog had been opened again in that moment, it shut. It takes a slow machine
or a very quick hand, and CI's slowest job was the slow machine. `Modal` (`src/ui/controls.tsx`) now takes the
word only while the dialog really is closed, and so does the pause sheet, which was written the same way
(pause, carry on, and pause again at once, and it carried on). Unit tests stand in for the browser and say
"closed" late (`tests/ui/modal.test.tsx`), and a browser test presses "Cancel", waits for the dialog to close
without letting the browser have its turn, and presses "Add a player". Each fails on the code as it was — the
browser test only at its second writing: the first pressed the two buttons one straight after the other, the
game took both in one go, the dialog never closed in between, and the test passed with the fault in.

_Run 37 failed_, in one job, the same way at both attempts: on the iPhone 13 held sideways, a chime bar in the
Music Lab's room was 46.97 points wide where the test asks for 48. **Also a fault in the game, and the test
was right.** On a phone held sideways the bars had 63% of the width; Safari leaves an iPhone 13 a page 750
points wide, and eight bars in 63% of that are 47 points each. Chromium never saw it because none of its
screens is that width: 844 passes, and under 720 the layout changes. The bars now have three quarters of the
width on any phone held sideways (57 points each at 750), and on the narrowest stand four and four, as they do
upright (105 by 81 at 640×256, where they were 53 wide). There are browser tests at 750×342, 640×256 and
568×320 that run in Chromium, so the next such fault is seen before it is pushed; and the sweep that measures
everything a child presses in an activity has the 750-point screen as a fourth.

The room is not live (the merge of pull request #8 was of its first commit, before the room), so nobody has
met 47-point bars. The dialog is live, as it has been all along.

**And two runs after those. The second ran everything, and everything passed.**

| Run | What                                                                   | Chromium, desktop and tablet       | Chromium, phones                   | WebKit, desktop and tablet                             | WebKit, phones                                     |
| --- | ---------------------------------------------------------------------- | ---------------------------------- | ---------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| 38  | pull request #9, Number Garden's numerals (`30d47ae`)                  | cancelled by the next push         | cancelled                          | cancelled                                              | cancelled                                          |
| 39  | pull request #9, the place kept through an update (`0afde1b`)          | 17.9 and 8.6 for the two halves    | 12.3 and 18.5 for the two halves   | 15.3 minutes, after 12.8 installing WebKit             | 22.1 minutes                                       |
| 40  | `main` after the owner merged pull request #9 (`dbbdbc3`)              | passed, both halves                | passed, both halves                | passed                                                 | passed                                             |
| 41  | pull request #10, Reading Cove's later activities (`563f46c`)          | 17.1 and 10.8                      | 17.4 and 21.2                      | 22.6 minutes                                           | 28.8 minutes                                       |
| 42  | `main` after the owner merged pull request #10 (`8288833`)             | passed, both halves                | passed, both halves                | passed                                                 | passed                                             |
| 43  | pull request #11, the help for a first visit (`4fce12e`)               | 25.4 and 12.6                      | 20.4 and 24.3                      | 21.8 minutes                                           | **failed**, both halves: 13.3 and 16.8             |
| 44  | pull request #11, the page that was too wide for an iPhone (`1decf66`) | 19.5 and 12.1                      | 17.4 and 24.8                      | 24.1 minutes                                           | 14.1 and 18.6, **passed**                          |
| 45  | `main` after the owner merged pull request #11 (`ed3efd6`)             | 24.5 and 12.4                      | 19.5 and 26.1                      | 24.2 minutes                                           | 15.0 and 16.9                                      |
| 46  | pull request #12, Robot Ridge's longer plans and bridge (`e9cdb5c`)    | 25.4 and 18.1                      | 22.2 and 34.7                      | **cancelled** at its 40 minutes, 566 of 567 tests done | 16.2 and 21.2                                      |
| 47  | pull request #12, CI's jobs dealt out in more parts (`9ba9418`)        | 14.1, 17.0 and 10.4 in three parts | 12.0, 17.8 and 26.9 in three parts | 11.8 and 14.0                                          | 15.9 and 33.0, the 33 after 12.6 installing WebKit |
| 48  | `main` after the owner merged pull request #12 (`3c322c5`)             | 16.1, 16.9 and 9.7                 | 11.0, 15.2 and 27.0                | 12.8 and 29.3, the 29.3 after 15.8 installing WebKit   | 13.4 and 21.4                                      |

Run 39 is the first to have Number Garden's numerals, the room at its three sizes and the dialog test in
Safari's engine, and all of them passed there. No test in any job needed a second attempt: the six artifacts
are between 0.5 and 1.0 MB, where one with a retried test's trace in it is several. The check itself took 1.8
minutes. The phones, as two halves, are well inside their limit. The WebKit job for the desktop and the tablet
spent 12.8 of its 28.7 minutes installing the browser, which is the network's doing and not the tests'; it has
taken half a minute in other runs, and is worth a look if it happens again, since that job's limit is forty.

The owner merged the pull request seventeen seconds after run 39's last job finished. Run 40 is the same tree
on `main`: green in all seven jobs in 26 minutes, and again no artifact over 1.0 MB, so no test in it needed a
second attempt either.

**Run 41** is pull request #10's first: Reading Cove's six later activities, the tests that listen to what the
voice says, and a sentence set on two lines on an upright phone, in Safari's engine for the first time. **Green
in all seven jobs, and no test needed a second attempt**: the six artifacts are between 0.56 and 1.14 MB, and
the largest, WebKit's phones, ends "365 passed, 190 skipped" with no test marked as retried. The times in the
table are whole jobs, by their start and end. **WebKit's phones took 28.8 of the 40 minutes they are allowed**,
which is the finding: that job has every test on one phone and the layout and journey tests on two more, and
it grows with every activity. "How to play" is shown in real time on each of those screens. From the push
after run 41 that job is two halves, as Chromium's phones already were, and CI has eight jobs.

The owner merged pull request #10 thirteen minutes after run 41's last job finished. **Run 42** is the same
tree on `main`: green in all seven jobs in 25.5 minutes, the six artifacts between 0.54 and 1.10 MB, so no test
in it needed a second attempt either.

**Run 43** is pull request #11's first (`4fce12e`): the help for a first visit, in eight jobs for the first
time, and "how to play", the help with the screen and "where to begin" in Safari's engine for the first time.
**Six jobs passed and two failed: both halves of WebKit's phones**, on the same two tests, on each of two
phones. One more test there needed a second attempt. Neither had anything to do with the job being split.

| Job                            | Result                                                                      | The whole job |
| ------------------------------ | --------------------------------------------------------------------------- | ------------- |
| Lint, types, unit tests, build | passed                                                                      | 1.8 minutes   |
| Chromium, desktop and tablet   | passed, both halves                                                         | 25.4 and 12.6 |
| Chromium, phones               | passed, both halves                                                         | 20.4 and 24.3 |
| WebKit, desktop and tablet     | passed                                                                      | 21.8          |
| WebKit, phones, first half     | **failed**: 221 passed, 72 skipped, 2 failed                                | 13.3          |
| WebKit, phones, second half    | **failed**: 173 passed, 119 skipped, 2 failed, 1 more at its second attempt | 16.8          |

The five artifacts of the browser jobs that passed are between 0.62 and 1.05 MB, so no test in them was run
twice. The two that failed are 13 MB each: a failed test's trace is in them, and they were read.

**The failure: the grown-ups' area was 440 pixels wide on an iPhone's 390.** `begin.spec.ts` ("is the
grown-up's to say") and `grownups.spec.ts` ("is readable and usable on this screen") both said "the page is
440 px wide on a 390 px screen", on WebKit's phone and on the iPhone 13, at the first attempt and at the
second, and named no control that ran off the screen. CI's picture of the page showed nothing out of place in
the part of it that fits a screen. So something that is not a control was too wide, further down, in Safari's
engine and not in Chromium's.

It was a select's own words. "Where to begin" has a list for each world, and Reading Cove's says "The
beginning: Listening for sounds all around, part 1". The control is as wide as its card, and its words are
longer than that. Chromium cuts a select's words off at the control's edge; WebKit lays them out at their full
length beneath it and counts them in the width of the page. Measured in Chromium, where they are cut off,
those words would end 435 pixels from the left if they were not; no other list's reach 420. WebKit, whose
letters are a hair wider, said 440. A page wider than its screen slides sideways under a finger, and on a real
iPhone a grown-up would have met that at once: **the test was right, and the fault was in the game.**

Every list in the grown-ups' area is now in a box of its own that cuts off whatever runs past it
(`src/parent/Select.tsx`); the edge that is seen, and the ring that says where the keyboard is, belong to the
box. And because a list's words are still cut short wherever they are longer than a phone is wide, in every
browser, and it is the end that goes ("part 1" or "part 2"), what was chosen is now written in full beneath
each list: "Play begins at “Listening for sounds all around, part 1”."

Only WebKit can show that the page is no longer too wide, and WebKit runs only in CI: the two tests that
failed there are the proof, when they pass there. What can be checked anywhere is checked as well: every list
is in a box that cuts off, fills it, and the box is on the screen. And the measure itself says more now. It
said that a page was too wide and not what made it so; it now names the innermost things that end past the
screen's edge and anything that holds more than it is wide, so the next failure of this kind says what it is.

**The second attempt: a sound clip put down to the wrong page.** `robot.spec.ts`, "the way is marked instead
of walked, and a faulty row is shown where it went wrong", failed its first attempt on WebKit's phone with
`uncaught: /127.0.0.1:4173/immutable/rr.steps.correct-BoltnQ2G.mp3 due to access control checks.` and passed
its second. It is the same test and the same recording as in run 30 (below), and what was done then was right
as far as it went: that sentence is WebKit's second report of a download cancelled by leaving a page, and it
is judged by the rule for the first, that a cancelled download is held against a test only if no other page
was asked for after it began.

What the rule had wrong was _whose_ a download is. It gave each request to the last page asked for. But a page
that is being left lives on until the next one has arrived. The test sees "Yes. Your steps took the robot to
the star" and asks for the next activity; a moment later the page it is leaving begins the recording of that
line; the next page arrives and the recording is cancelled. Counted as the new page's own, cancelled with
nothing after it, it failed the test. In run 30 the recording had begun before the next page was asked for;
this time it began after. The guard now keeps two things, the pages asked for and the page that is there
(`Pages`, in `e2e/diagnosis.ts`), and a request belongs to the page that is there to make it.

**This was half right, and did not mend it.** Whose a download is was wrong, and `Pages` is kept. But the
recording was never begun, so there was no request to give to anybody: the same test failed the same way in
run 45, with this change in place. Run 45, below, has the cause, read in WebKit's source and not guessed.

It could not be made to happen in Chromium. Chromium says nothing at all of a download it cancels by leaving a
page: that was tried with the download held back by the test, and again with the network slowed until the
download was truly under way when the page was left. So the two new browser tests stage it. One makes the same
things happen in the same order (the next page asked for, and slow to come; a request from the page being
left; that request cancelled; the next page arriving) and the guard must hold it against nobody. The other is
the other half of the rule: a download cancelled with no page after it is held against the page that began
it, and no longer once another page is asked for. Both are for Chromium alone, because the cancelling is done
by the test in the words Chromium uses.

**Thirteen faults were put back**, seven against the unit tests and six in a browser, each written so that
everything still builds. All thirteen were caught, but not all at the first time of asking: see after the
table.

| The fault                                                          | Caught by                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| A request is given to the last page asked for (the rule as it was) | three unit tests; and in a browser by the first staged test, with CI's own line |
| Moving about inside a page counts as the next page arriving        | its unit test                                                                   |
| What follows a `#` in an address is not ignored                    | its unit test                                                                   |
| A cancelled download is held against nobody, ever                  | two unit tests; in a browser, the second staged test                            |
| A cancelled download is always held against the test               | both staged tests                                                               |
| The guard is never told that a page has arrived                    | the second staged test                                                          |
| The line beneath a list always names the first activity            | its unit test                                                                   |
| The line beneath a list is left out                                | its unit test                                                                   |
| A list has no box of its own                                       | its unit test                                                                   |
| The box round a list does not cut off what runs past it            | the grown-ups' screen test, as a phone                                          |
| A list does not fill its box                                       | the same                                                                        |

(Two of the thirteen are one fault tried both ways, in a unit test and in a browser.)

**Three things were wrong with the new tests before they were right**, and each was found by putting a fault
back or by running a test more than once.

1. **The staged test passed with the old rule put back.** Its first version held the old page's download back
   in the test's own hands, to keep it under way; and a download held there is never reported as cancelled at
   all. So nothing was held against anyone, under either rule. (The first fault written to show it did not
   build, either: it left a field unread. A fault that does not build proves nothing.) The test now cancels
   the request itself and checks the order in which things happened.
2. **The lists were found in one step and measured in the next.** The card is drawn afresh when the player
   changes, a moment after a new player's name appears; once in six runs the lists that were measured were no
   longer on the page, and what cuts them off read as nothing at all. They are found and measured in one go.
3. **The second staged test failed without any fault in it**, on a warning that every test is allowed, and its
   failing was at first read as four faults caught. What the guard reports to a test now passes through the
   same allowances as its verdict, the test passes as it stands, and the four faults were put back again.

**Run 44** is the push with those two fixes (`1decf66`). **Green in all eight jobs, and WebKit's phones passed
the two tests that had failed**: the grown-ups' area fits an iPhone's screen in Safari's engine. The times, by
each job's start and end: lint, types, unit tests and build 1.2 minutes; Chromium's desktop and tablet 19.5 and
12.1; Chromium's phones 17.4 and 24.8; WebKit's desktop and tablet 24.1; WebKit's phones 14.1 and 18.6.

It was green, and it was not clean. Five artifacts are between 0.61 and 1.06 MB. Three are 6.6, 8.6 and 24.5
MB, and a large one means a test's first attempt failed and its trace was kept: **six tests passed only at
their second attempt**, in three jobs. Each was read.

1. **Three of the six are one test, and one fault in the game.** `journey.spec.ts`, "is asked who is playing
   only once in a visit, and is known by their picture the next time", on the phone, the Pixel 7 and the Pixel
   7 on its side: a child who had passed "how to play" by was, at the next visit, shown it again. Passing it by
   wrote down that the player had been shown as the page was left, and went on without waiting for the
   writing. The test refreshes the page the moment the islands are there; a page refreshed, or closed, in that
   moment had not been written. (The same was found and put right for the end of "how to play" before it was
   ever pushed, and the way out by the house was left as it was.) The house now writes it down first and
   leaves when it has been written, or when it has turned out that it cannot be; so "the islands are there"
   means "it is written". Five faults were put back against three new unit tests, which hold the writing in
   the test's hands to see that the page is not left while it waits. Four were caught at once. The fifth, a
   second tap being a second leaving, passed: the test held each writing separately, so the second tap's
   leaving never came. It holds one writing for both taps now, and the fault fails.
2. **One was a test that read one moment in two steps.** `numbers.spec.ts`, "a numeral shows its amount in dots
   only while it is being counted", in WebKit: with the clock held it saw one dot on the 1 and three on the 3
   together, which the page never shows. It counted the dots on one numeral and then, in a second step, on the
   other; between the two the page finished drawing what the last tick of the clock had set going. The clock
   was held, and the page was still not standing still. Everything such a test reports is now read in one go,
   by one function run in the page. Two more tests read two things in two steps and had not yet been caught
   out (`garden.spec.ts`, the look that is asked for again; `music.spec.ts`, the same or different), and they
   are mended the same way. `watchFor` says so where it is written.
3. **Two were the page that never comes**, in WebKit, in the accessibility checks of two worlds' pages. A
   test's first page is asked for and nothing arrives for a whole minute; at the second attempt it is there in
   a second or two. These are the fifth and sixth times, and the first time there have been two in one job.
   The note each left is the same as before: "the last page asked for had not been read yet; 1 unanswered:
   document /world/memory-forest (asked for 59.8 s before; the browser reported no answer at all; requests
   for /world/memory-forest that reached the server after that: at +0.0 s from Macintosh, answered in 1 ms);
   the page stood at about:blank". The server had the request at once and answered it in a millisecond, and
   the browser never read the answer. **Not explained**, and nothing in the game is asked for at that moment.
   It costs a minute and a second attempt each time, in CI's WebKit only; it has never been seen in Chromium,
   here or there.

The owner merged pull request #11 four minutes after run 44's last job finished. **Run 45** is the same tree
on `main` (`ed3efd6`): **green in all eight jobs**, in 26.1 minutes; lint, types, unit tests and build 1.6. It
was not clean either. Five artifacts are between 0.59 and 1.04 MB; Chromium's phones, second half, left 5.0 MB
and WebKit's phones, second half, 3.0 MB. **Two tests passed only at their second attempt**, and both were
read: the log for each, and for the second the report CI kept, which has every step of the failed attempt
with its time.

1. **The fault of passing "how to play" by, a fourth time.** `journey.spec.ts`, "is asked who is playing only
   once in a visit, and is known by their picture the next time", on the Pixel 7: the islands did not come
   after the page was loaded again, because "how to play" had come back instead. It is the fault under run 44,
   in the tree that run 44 tested and the owner merged, so **it is live**; the fix is in this push.
2. **The guard, wrong about WebKit a third time.** `robot.spec.ts`, "the way is marked instead of walked, and
   a faulty row is shown where it went wrong", on WebKit's phone, failed for
   `uncaught: /127.0.0.1:4173/immutable/rr.steps.correct-BoltnQ2G.mp3 due to access control checks.` The same
   test, the same recording and the same sentence as in runs 30 and 43, each of which ended with the guard
   mended and the matter thought closed.

   **What the sentence is, read in WebKit's source** (`Source/WebCore`, its main branch on 2026-11-26). From
   the moment another page has been asked for until it arrives, WebKit will not begin a download for the page
   that is still there: `CachedResource::load` fails it before it starts ("Failed security check -- state is
   provisional"; the same while the page's loader is stopping, or there is no active document).
   `CachedResourceLoader::requestResource` turns a load that failed at once into an error of the
   access-control kind, under the comment "Synchronous cancellations are likely due to access control". And
   `ThreadableLoader::logError` puts that on the console as "Fetch API cannot load … due to access control
   checks." The same function returns without a word for a download that was begun and then cancelled.

   So the sentence was never a second report of a cancelled download, which is how it was read after run 30,
   and there was never a request to put down to the wrong page, which is how it was read after run 43. **No
   request is made at all**, so the browser reports none, and the sentence is the only thing said. The guard
   looked for the download among the requests it had seen, did not find it, and held the sentence against the
   test. It could not have found it. In all three runs the failure was the sentence alone, with no cancelled
   request beside it, which the first two readings should have had to explain and did not.

   **Why this test, and why now and then.** It goes to another activity the moment "Yes. Your steps took the
   robot to the star" is on the screen, and the page asks for that line's recording at about the same moment.
   What was seen: in the attempt that passed, CI's trace has the recording asked for 13 ms before the test
   asked for the next page, and fetched in 1.3 ms; in the attempt that failed, the report has the next page
   asked for 4 ms after the check of the caption began, where the other attempt took 9. What is inferred from
   that, since no trace is kept of a first attempt: that time, the recording was asked for just after the
   next page, and was refused.

   **What was done.** WebKit's sentence, about a file of this site, is now put down to the page that is there
   when it is said, and judged as a cancelled download is: held against a test only if no other page is asked
   for after that page (`LeftUndone`, in `e2e/diagnosis.ts`). It is judged when the test ends, so it does not
   matter which the browser reports first, the sentence or the next page. A sentence that is held says which
   page was there and how many had been asked for, so that the next reader is not left to guess. The lookup
   among requests is gone.

   **How it is known to be right this time.** By unit tests of the rule, against which ten faults were put
   back and all caught; by three faults put back in the guard's wiring and caught by the two staged tests in
   Chromium; and by a new test that stages nothing: in Safari's engine, the next page is held back, the page
   that is still there asks for a file, and the test requires that the file is refused, that the server is
   never asked for it, that WebKit's sentence is what the guard let pass, and that nothing is held against the
   test. **That test runs only in CI, and has not run yet.** If the reading above is wrong, it fails, and says
   which part.

**Run 46** is pull request #12's first (`e9cdb5c`): Robot Ridge's three later activities, the fixes above, and
the guard's new rule, in Safari's engine for the first time. **Seven jobs passed and one was cancelled at its
forty-minute limit**: WebKit's desktop and tablet. No test failed in any job, and none needed a second
attempt: the six artifacts are between 0.65 and 1.03 MB, and no log has a failed or retried line.

| Job                            | Result                                                      | The whole job |
| ------------------------------ | ----------------------------------------------------------- | ------------- |
| Lint, types, unit tests, build | passed                                                      | 2.1 minutes   |
| Chromium, desktop and tablet   | passed, both halves                                         | 25.4 and 18.1 |
| Chromium, phones               | passed, both halves                                         | 22.2 and 34.7 |
| WebKit, desktop and tablet     | **cancelled at 40 minutes**, with 566 of 567 tests done     | 40.2          |
| WebKit, phones                 | passed, both halves: 239 and 183 passed, 73 and 128 skipped | 16.2 and 21.2 |

**Why it was cancelled: the tests had 23 minutes and needed a few seconds more.** Putting WebKit on the machine
took 16 minutes 40 seconds, where it takes half a minute. The log has where the time went: 16 minutes 15
seconds of it was fetching the 185 packages of Ubuntu's that WebKit needs, 129 MB at 133 kB a second, from the
mirror that runner was given (five packages were given up on twice there and fetched from Ubuntu's own
archive instead). The other two WebKit jobs, started in the same second on other machines, fetched the same
packages from a mirror of the same name in three and four seconds. WebKit itself came in 2.4 seconds. The
tests then ran for 23 minutes: 566 of the 567 had a result when the job was stopped, 357 passed, 209 skipped by
design, none failed, none run twice; the last was nine seconds from its end.

So nothing in the game or its tests failed, and the cause is outside the repository. What is in the
repository is how little room there was for it: a job whose tests take 23 of its 40 minutes fails whenever
the machine takes 17 to get ready, and it has taken 13 before (run 39). **The same was waiting to happen in
Chromium:** in this run the second half of the phones took 34.7 of its 40 minutes, 5.7 of them the same slow
fetching, and its tests alone take 29.

**What was done.** The jobs are dealt out in more parts: Chromium's desktop and tablet in three (the two took
25 and 18 minutes of tests), Chromium's phones in three (22 and 29), WebKit's desktop and tablet in two (23.5
as one). No part should now need more than about half of its forty minutes for its tests. The limit itself is
left at forty: it is there to stop a job that hangs.

**What that run showed that was waited for.**

- **The guard's reading of WebKit is right.** The test that stages nothing ran for the first time, in both of
  WebKit's screens that run it, and passed (1.3 and 1.1 seconds): the file asked for while the next page was on
  its way was refused, the server was never asked for it, WebKit's sentence was what the guard let pass, and
  nothing was held against the test. And "the way is marked instead of walked", which had failed over that
  sentence in runs 30, 43 and 45, passed at its first attempt on both.
- **Robot Ridge's three later activities passed in Safari's engine**, on every screen that reached them: the
  desktop, the tablet, the phone and the iPhone upright and on its side.
- **The fault of passing "how to play" by did not show**: the test that it failed four times in the two runs
  before passed at its first attempt on all nine screens that run it. That is what the fix should do; it is
  not proof, since the fault showed only now and then.

**Run 47** is pull request #12's second (`9ba9418`), the first with eleven jobs. **All eleven passed, and one
test needed a second attempt.** Nine artifacts are between 0.6 and 1.0 MB, and one, of the third part of
Chromium's desktop and tablet, is 2.3: a trace is in it.

| Job                            | Result                  | Its tests           | The whole job       |
| ------------------------------ | ----------------------- | ------------------- | ------------------- |
| Lint, types, unit tests, build | passed                  |                     | 1.6 minutes         |
| Chromium, desktop and tablet   | passed, all three parts | 13.2, 16.4 and 9.6  | 14.1, 17.0 and 10.4 |
| Chromium, phones               | passed, all three parts | 11.5, 14.6 and 26.3 | 12.0, 17.8 and 26.9 |
| WebKit, desktop and tablet     | passed, both halves     | 11.2 and 13.0       | 11.8 and 14.0       |
| WebKit, phones                 | passed, both halves     | 15.1 and 20.2       | 15.9 and 33.0       |

**The test that needed a second attempt** was Reading Cove's "has the picture of the word above three places,
and lights each place as its sound is said", on the desktop. It did not get as far as the game: it stopped
where it holds the page's clock, with `clock.pauseAt: Cannot fast-forward to the past`. **The fault was in the
tests' own tool.** A test holds the clock by reading the page's time and asking the clock to stop 20 ms after
it, because Playwright's clock can only be asked to stop at a time and will not stop at one that has gone by.
The page's clock runs on while the time is read and sent back, and that once, on a busy machine, the two
steps took longer than 20 ms. The report has both attempts step by step: the reading took 29 ms and the asking
began 33 ms after it; at the second attempt, 31 and 32, and it passed, so it was near the edge both times. A
run holds the clock a few hundred times, and this is the first that lost.

It was tried outside any test before anything was changed: asked to stop 20 ms after a time read a tenth of a
second earlier, Playwright's clock refuses in exactly those words, **and is left held**; asked again with the
time read afresh, it stops. So `holdClock` (`e2e/fixtures.ts`) now asks again when it is refused, up to five
times, and does not rely on the clock having been left held. Two tests stage it (`e2e/smoke.spec.ts`): the
reading is made to take a tenth of a second, once, and the clock must be held after two readings, with a
timer set in the page not going off until the test moves the clock; and a time that is always long gone must
be given up on after five. Three faults were put back and all caught: not asking again, asking fifty times,
and setting the clock going again once held.

**And the time.** The split into eleven jobs was made on the promise that no part would need more than about
half of its forty minutes for its tests. One did: **the third part of Chromium's phones took 26.3 minutes**,
where the first two took 11.5 and 14.6. Playwright deals tests out by number, one screen after another. The
phone is the screen with every test, so the first two parts were the phone's and nothing else's, and the
third was the four other phones', which run only the tests of layout: the long ones. WebKit's phones were
dealt the same way, and its second half took 20.2 minutes of tests after **12.6 minutes of getting WebKit**:
33.0 of its 40, from the same slow fetching of Ubuntu's packages that cancelled a job in run 46, on another
machine.

**Run 48** is `main` after the owner merged pull request #12 (`3c322c5`), eleven seconds after run 47 went
green. **All eleven jobs passed, and two tests needed a second attempt**, one in each of WebKit's
desktop-and-tablet jobs: their artifacts are 14.0 and 3.2 MB, and the other eight are between 0.5 and 0.9.

| Job                            | Result                  | Its tests           | The whole job       |
| ------------------------------ | ----------------------- | ------------------- | ------------------- |
| Lint, types, unit tests, build | passed                  |                     | 1.4 minutes         |
| Chromium, desktop and tablet   | passed, all three parts | 15.6, 16.3 and 9.1  | 16.1, 16.9 and 9.7  |
| Chromium, phones               | passed, all three parts | 10.5, 14.6 and 26.3 | 11.0, 15.2 and 27.0 |
| WebKit, desktop and tablet     | passed, both halves     | 12.0 and 13.3       | 12.8 and 29.3       |
| WebKit, phones                 | passed, both halves     | 12.8 and 20.7       | 13.4 and 21.4       |

1. **As an iPad, the page that never comes, for the seventh time.** The Music Lab's "fits the screen, with a
   drum far larger than a small finger needs" asked for the world's page at its first line and waited the
   whole minute. The note it left is the same as the six before it in every particular: "the last page asked
   for had not been read yet; 1 unanswered: document /world/music-lab (asked for 59.9 s before; the browser
   reported no answer at all; requests for /world/music-lab that reached the server after that: at +0.0 s
   from iPad, answered in 0 ms; …); the page stood at about:blank; the test that had the browser before this
   one: [ipad] who had what? › shows one of them again, alone, and asks what went with it". The server had
   the request at once and answered it at once, and the browser never read the answer. At its second attempt
   the page came. **Not explained.** Seven times now, in seven different tests after seven different tests,
   always a test's first page, always CI's WebKit, never Chromium anywhere. It costs a minute and a second
   attempt.
2. **As WebKit's desktop, three taps that brought no nudge.** "Taps that land on nothing: are answered by
   showing what can be tapped" taps the picture three times while Glim is showing, and "My turn" should then
   be pointed out. At its first attempt nothing was, for the ten seconds the test waits; at its second, it was
   there 11 ms after the third tap. The report has the steps of both: at the first attempt the taps were made
   34 to 179 ms after the activity first showed, and at the second 228 to 335 ms after. The picture taken when
   the test gave up shows the demonstration played to its end and no ring anywhere. **Not explained, and not
   reproduced.** Here, in Chromium, three taps made 0, 15, 40, 80, 150 and 300 ms after the activity shows
   brought the nudge 48 times in 48, half of them with the processor slowed six times. The rule that counts
   taps was read again for this: it counts every press the lesson is given within eight seconds, and is
   cleared only by a press on something that can be pressed or by a new step; nothing in it depends on how
   soon the taps come. So either WebKit did not give the page three presses, or one of them landed somewhere
   else, and the report cannot say which, because no trace is kept of a first attempt. **What was done:** the
   test has the page note every press it is given (when, on what, in the lesson or not) and says so when the
   nudge does not come. Tried with a fault that makes a nudge need four taps: it fails with "the page was
   given 3 presses: 643 ms: svg, in the lesson; 648 ms: svg, in the lesson; 679 ms: svg, in the lesson". If it
   happens again, the failure will say whether the presses arrived.

**And the time, again.** WebKit's second desktop-and-tablet job took 29.3 minutes, **15.8 of them getting
WebKit**. That is three runs running in which one of the WebKit jobs was given the slow mirror: 16.7 minutes
in run 46, 12.6 in run 47, 15.8 in run 48, a different job each time, with the other jobs of the same run
taking half a minute. It is not rare, and nothing in the repository can make it quicker short of not fetching
those packages at all. What the repository can do is leave room, and it now does so by screen and not by
count: **the jobs are dealt out by name** (`.github/workflows/ci.yml`). The phone has two jobs to itself and
the other four Chromium phones share two; WebKit's phone has two and its iPhones one. Twelve browser jobs,
the longest of which should have about sixteen minutes of tests, by the times of these two runs. The next
run is the first to try it.

**Run 49** is pull request #13's (`c140bc6`): Memory Forest's two later activities, and the first run with
twelve browser jobs dealt out by screen. **All thirteen jobs passed, and one test needed a second attempt**,
as WebKit's desktop: that job's artifact is 14.1 MB, and the other eleven are between 0.5 and 0.75. 1975
tests ran, counting each on each screen it runs on.

| Job                                              | Result | Its tests (minutes) | The whole job      |
| ------------------------------------------------ | ------ | ------------------- | ------------------ |
| Lint, types, unit tests, build                   | passed |                     | 1.7                |
| Chromium, desktop and tablet, in three parts     | passed | 15.3, 15.8 and 9.1  | 15.8, 16.4 and 9.5 |
| Chromium, the phone, in two halves               | passed | 11.0 and 14.3       | 16.4 and 14.7      |
| Chromium, the small phone and the phone sideways | passed | 11.4                | 11.8               |
| Chromium, the Pixel, upright and sideways        | passed | 12.3                | 13.8               |
| WebKit, desktop and tablet, in two halves        | passed | 12.5 and 13.6       | 13.2 and 14.3      |
| WebKit, the phone, in two halves                 | passed | 11.3 and 12.2       | 12.2 and 12.9      |
| WebKit, the iPhone, upright and sideways         | passed | 12.5                | 17.1               |

**The twelve jobs do what they were made for.** The longest set of tests is 15.8 minutes, where one part of
the phones took 26.3 in run 48, and the longest job is 17.1, where one took 29.3 and one was stopped at its
forty. Two jobs were given the slow mirror again (5.1 minutes getting Chromium for the phone's first half,
4.3 getting WebKit for the iPhones) and nothing came of it: there is room now.

1. **As WebKit's desktop, three taps that brought no nudge, a second time: explained.** The same test as in
   run 48, at the same place. This time the note was there, and the failure said what the page had been
   given: "3 presses: 1170 ms: svg, in the lesson; 1227 ms: svg, **outside the lesson**; 1361 ms: svg, in the
   lesson". The second tap, 57 ms after the first and at the same spot, landed on a picture that was not in
   the activity. Nothing in the page is drawn outside the activity. What the note had caught was the picture
   under the finger being **taken out of the page while the press was on its way to the game**:

   - A press is given to the window first, then to the document, then on down to what was pressed. The game
     listens at the window, to wake the audio at every touch, as phones require; and it told whoever listens
     for a change in the audio there and then.
   - React answers a store that has changed by drawing again at once, in the gap between one listener and
     the next. And when it does, it brings along any drawing that was waiting its turn.
   - The picture that is asked about is drawn afresh each time Glim begins counting it. If that was the
     drawing waiting, the picture the finger had just landed on was replaced before the document, or the
     activity, had been given the press. The press then belonged to something no longer in the page. React
     finds who a press is for by what was pressed, and a thing it has taken out of the page is nobody's: so
     the activity was never given it. Three taps, two counted, no nudge.

   The first two links and the last were measured, here and in CI's own note. The third is how React's code
   reads, and fits what was seen; it was not watched happening.

   It needs two things at once: the audio to have woken since the last press, and a drawing to be waiting at
   that instant. Staged here, in Chromium, by switching from outside what the audio says of itself before
   each press and delivering React's own work 150 ms late: **5 of 115 presses** had what was pressed in the
   page when the window was given the press and out of it when the document was. With either thing alone,
   and with the work only 20 ms late: 0 of 115, each. That is why 48 tries here in the plain way never
   showed it, and why a busy machine in Safari's engine does.

   **Put right:** the audio is still woken inside the press, and whoever listens is told a moment later,
   when the press has been delivered to everything it is for (`installAudioUnlock`, `src/audio/index.ts`).
   Staged the same way afterwards: 0 of 115, three times. A browser test stages it on every run
   (`e2e/help.spec.ts`: with the old behaviour put back it failed 8 times in 8), and two unit tests hold the
   rule itself. The note now tells "taken out of the page during the press" apart from "outside the lesson".

   **What it was for a child.** In Safari, on an iPhone or an iPad: now and then, a tap on a picture in the
   moment the sound first came on was seen by nothing, and the help that comes after three such taps came
   after four. An answer is taken when the finger lifts, from whatever is under it then, so an answer should
   not have been lost this way, and none was seen to be. It has been live since the first-visit help was
   (pull request #11), and is until this is.

**Run 50** is `main` after the owner merged pull request #13 (`a0e60f8`), 36 minutes after run 49 went green.
**Twelve jobs passed and one failed**: the second half of WebKit's phone. Its artifact is 150.5 MB; the other
eleven are between 0.5 and 0.75, so nothing else needed a second attempt anywhere.

| Job                                              | Result         | Its tests (minutes) | The whole job      |
| ------------------------------------------------ | -------------- | ------------------- | ------------------ |
| Lint, types, unit tests, build                   | passed         |                     | 1.5                |
| Chromium, desktop and tablet, in three parts     | passed         | 14.5, 15.7 and 8.9  | 16.9, 16.4 and 9.5 |
| Chromium, the phone, in two halves               | passed         | 11.4 and 15.3       | 12.5 and 16.0      |
| Chromium, the small phone and the phone sideways | passed         | 10.9                | 11.4               |
| Chromium, the Pixel, upright and sideways        | passed         | 14.9                | 15.5               |
| WebKit, desktop and tablet, in two halves        | passed         | 11.9 and 14.2       | 12.8 and 14.9      |
| WebKit, the phone, in two halves                 | **one failed** | 12.8 and 13.8       | 13.4 and 14.6      |
| WebKit, the iPhone, upright and sideways         | passed         | 14.1                | 14.8               |

**Two tests ran out of time, at both attempts each: 126 passed, 143 skipped by design, 2 failed.** They are
Robot Ridge's "A long way round" played through with every board measured, on a small phone (360 by 740) and
on the narrowest held sideways (640 by 256). Each stopped at its sixty seconds, in the middle of waiting for
something to arrive on the page, with nothing unanswered and nothing wrong on the screen.

**The cause is in the tests and was there to be seen in run 49.** There, the same two tests passed in **59.5
and 59.4 seconds** of the 60 they are allowed. In run 50 the machine was a little slower (the other six tests
of that kind took 0.3 to 1.4 seconds longer each, on tests of 14 to 43 seconds: one to three in a hundred),
and that was enough. Nothing in the game is slow or stuck: the test plays a whole sitting of the longest
activity there is, ten steps at a time at the pace a child is shown them, and measures every board on the
way. In Chromium it takes 55.

They were not the only ones. Read from all twelve reports of run 49, of the tests that had the one minute
every test has unless it asks for more: **two took 59.5 and 59.4 seconds, 17 took 42 to 55, and 55 more took
30 to 42.** The time a test after a 3D scene takes was written down as "closer than it should be" in Phase 02
and left; this is the same thing, come due on other tests.

**Put right, two ways.** A test now has **two minutes** unless it asks for more
(`playwright.config.ts`): the limit is there to stop a test that hangs, and it should stand well clear of
what any test takes. And a test that passes having used more than **three quarters** of its limit now fails
for that, with the remedy in its words (`nearItsLimit`, `e2e/fixtures.ts`): the next test to be written this
long says so on the day it is written, in every run, and not on `main` weeks later when a machine is slow.
Two tests hold it; one of them is a test built to fail by the guard and by nothing else, which is reported as
a failure if it passes.

**The job was not run again.** A second run of it would pass or fail by half a second's luck, and would show
nothing either way. `main` keeps its red mark until the next merge, which carries the two minutes. **The live
site is not affected**: it was checked on its own (_The live site_, below).

**And the time, a third time.** The two halves of the desktop took 15.5 and 11.3 minutes, where the one job
had taken 29.2: that worked. But the phones took 32.5 of their 40: the phone is the screen everything pressed
is measured on, 54 tests then and more now. The phones are two halves as well.

**Run 51** is pull request #14's first (`48df1d8`): Inventor Island's shelter, a grown-up's word and "My
inventions", with the two minutes and the three quarters above. **All thirteen jobs passed**, in 30.2 minutes
from first to last. Ten artifacts are between 0.53 and 0.76 MB. Two are not: WebKit's phone, first half, is
3.4 MB, and WebKit's desktop and tablet, second half, is 20.3 MB (one traced attempt of a test that moves a
held clock ninety times is 10.4 MB, and the report keeps it twice). **Two tests passed only at their second
attempt**, one in each, and both were read.

| Job                                              | Result                                 | Its tests (minutes) | The whole job      |
| ------------------------------------------------ | -------------------------------------- | ------------------- | ------------------ |
| Lint, types, unit tests, build                   | passed                                 |                     | 2.1                |
| Chromium, desktop and tablet, in three parts     | passed                                 | 16.1, 13.3 and 8.8  | 16.6, 14.8 and 9.7 |
| Chromium, the phone, in two halves               | passed                                 | 11.9 and 14.9       | 13.2 and 15.6      |
| Chromium, the small phone and the phone sideways | passed                                 | 11.5                | 16.7               |
| Chromium, the Pixel, upright and sideways        | passed                                 | 15.4                | 15.9               |
| WebKit, desktop and tablet, in two halves        | passed, one test at its second attempt | 12.9 and 13.4       | 13.6 and **30.1**  |
| WebKit, the phone, in two halves                 | passed, one test at its second attempt | 12.1 and 11.9       | 13.6 and 14.0      |
| WebKit, the iPhone, upright and sideways         | passed                                 | 13.8                | 14.5               |

**The two that turned `main` red have room now.** Robot Ridge's "A long way round", measured board by board
on the small phone and on the narrowest held sideways, took **57.3 and 57.2 seconds** in WebKit, of the 120 a
test now has: under half. Read from the three WebKit reports that were fetched (494 tests), the next slowest
are 51.6, 46.0 and 45.3 seconds; nothing is near the three quarters at which a passing test now fails.

**One job spent sixteen and a half minutes fetching its browser** (`playwright install --with-deps webkit`,
10:56:36 to 11:13:07; the same step took half a minute to two minutes in the other eleven, and five minutes
in one). Its tests then took 13.4 minutes, as they do, and the job ended at 30.1 of the 40 it is allowed. It
is the machine CI lent or the network it had, and nothing in the repository; it is written down because
another ten minutes of it would have cancelled a job in which nothing was wrong. Nothing was changed for it.

1. **As WebKit's phone, the page that never comes, an eighth time, and now it cost two minutes.**
   `a11y-worlds.spec.ts`, "a world's front door on a phone held sideways › Robot Ridge": the test's first
   line asks for the world's page, and the note it left is the note of the seven before it, word for word but
   for the time: "the last page asked for had not been read yet; 1 unanswered: document /world/robot-ridge
   (asked for 119.9 s before; the browser reported no answer at all; requests for /world/robot-ridge that
   reached the server after that: at +0.0 s from Macintosh, answered in 0 ms); the page stood at about:blank;
   the test that had the browser before this one: [webkit-phone] a world's front door on a phone held
   sideways › Reading Cove". At its second attempt the page came at once. **Still not explained.** Eight
   times in eight tests after eight different tests, always a test's first page, always CI's WebKit.

   What changed is what it costs. A test that waits for a page waited as long as the test had: a minute
   until run 50, and two since. **A page now has half a minute to come** (`PAGE_LIMIT`, in
   `e2e/diagnosis.ts`, given to Playwright as its `navigationTimeout`). That is not a guess: every page load
   in thirteen of CI's reports was read (run 49's twelve and one each of runs 50 and 51: **2859 loads**). The
   slowest that came took **4.7 seconds**, the next 1.7, and every other one under a second; the one that
   did not come took 120. Half a minute is six times the slowest page there has been. The guard's note is
   now added to a test that fails with a page still owed, as well as to one that runs out of its own time,
   since the first is the second found out sooner. A test asks for a page that is never answered and finds
   itself let go after half a minute. Tried three ways: as it is (passes, in 35 seconds); with the limit
   taken out (the test **fails after 2.2 minutes**, for waiting too long); and with the failure let through
   (the guard adds: "out of time: the last page asked for had not been read yet; 1 unanswered: document
   /a-page-that-never-comes (asked for 35.0 s before; the browser reported no answer at all; no request for
   /a-page-that-never-comes reached the server after that); the page stood at about:blank; this was the first
   test in its browser"). The first try at the middle one did not build (the limit's name was left imported
   and unused, and the build stops for that), so no test ran and nothing was shown; it was put another way.

2. **As WebKit's desktop, a test that looked for something after it had been and gone.** `numbers.spec.ts`,
   "a numeral shows its amount in dots only while it is being counted". The test pressed "My turn", and
   then waited for Glim to be counting the snails, which Glim does for about a second, about two seconds
   into the child's turn. The report has every step of both attempts with its time. At the second attempt
   the press took 0.95 seconds to come back and the counting was seen two seconds later. At the first the
   press took **5.08 seconds** to come back, on the machine that had just taken sixteen minutes to fetch its
   browser, in the first test that worker ran: the counting was over before the test first looked, and it
   waited its ten seconds for what had already happened. **Put right in the test**: the clock is held before
   the child's turn begins and is moved on by the test, which watches the counting come and go ("not being
   counted", "being counted", "not being counted", with no dot on either numeral throughout). That is how
   the second half of the same test already watched a wrong answer being counted; the first half had been
   left to chance. It takes 4.8 seconds where it took ten. Tried with two faults: with a numeral showing its
   dots all the time, and with the snails never said to be being counted, it fails, each time for that.

**Run 52** is `main` after the owner merged pull request #14 (`3f5c5f7`), at 11:27:06 UTC: thirty-one seconds
after run 51's last job went green. **All thirteen jobs passed**, in 19.0 minutes, and `main` has its green
mark back: the two tests that had turned it red passed there with half their time to spare, as in run 51.
Eleven artifacts are between 0.51 and 0.75 MB; WebKit's phone, first half, is 14.3 MB. **One test passed
only at its second attempt**, and it was read.

| Job                                              | Result                                 | Its tests (minutes) | The whole job      |
| ------------------------------------------------ | -------------------------------------- | ------------------- | ------------------ |
| Lint, types, unit tests, build                   | passed                                 |                     | 1.7                |
| Chromium, desktop and tablet, in three parts     | passed                                 | 18.3, 12.4 and 8.7  | 18.9, 13.4 and 9.6 |
| Chromium, the phone, in two halves               | passed                                 | 11.7 and 15.4       | 17.7 and 15.9      |
| Chromium, the small phone and the phone sideways | passed                                 | 12.4                | 13.0               |
| Chromium, the Pixel, upright and sideways        | passed                                 | 14.4                | 15.0               |
| WebKit, desktop and tablet, in two halves        | passed                                 | 14.0 and 15.6       | 14.8 and 16.6      |
| WebKit, the phone, in two halves                 | passed, one test at its second attempt | 14.6 and 12.4       | 15.3 and 13.1      |
| WebKit, the iPhone, upright and sideways         | passed                                 | 15.4                | 16.1               |

**It was the page that never comes, a ninth time**, and on this commit it still cost two minutes.
`inventor.spec.ts`, "a mend › shows the answer after three tests that did not work, so that nobody is stuck",
as WebKit's phone: the test's first line asks for the activity's page, and nothing comes. The note is the
same as the eight before it, with one thing more: "1 unanswered: document
/world/inventor-island/play/ii-balance-01 (asked for 119.9 s before; the browser reported no answer at all;
requests for /world/inventor-island/play/ii-balance-01 that reached the server after that: at +0.0 s from
Macintosh, answered in 1 ms; at +103.1 s from Macintosh, answered in 0 ms); the page stood at about:blank;
the test that had the browser before this one: [webkit-phone] a mend › can be helped". The second request,
103 seconds on, is not this test's: the server's note is of every request for that address, and another test
of the same file, in the other worker, opens the same activity. At its second attempt the page came in half
a second. **Still not explained.** The half minute a page now has (_Run 51_, above) was not in this commit;
it is in the next.

The first part of Chromium's desktop and tablet took 18.3 minutes, where it took 16.1 in run 51 and 14.5 in
run 50. It is the part with the most to play, and it grows with every activity; it has 40 minutes.

**Run 53** is the first run on pull request #15 (`8ae92f3`: Explorer Harbor's globe, the half-minute limit
on a page, and the mended Number Garden test). **All thirteen jobs passed**, in 18.3 minutes. Eleven
artifacts are between 0.56 and 0.78 MB; WebKit's desktop and tablet, first half, is 22.5 MB. **One test
passed only at its second attempt**, and it was read.

| Job                                              | Result                                 | The whole job (minutes) |
| ------------------------------------------------ | -------------------------------------- | ----------------------- |
| Lint, types, unit tests, build                   | passed                                 | 1.8                     |
| Chromium, desktop and tablet, in three parts     | passed                                 | 15.9, 18.3 and 10.2     |
| Chromium, the phone, in two halves               | passed                                 | 16.8 and 16.1           |
| Chromium, the small phone and the phone sideways | passed                                 | 12.7                    |
| Chromium, the Pixel, upright and sideways        | passed                                 | 16.4                    |
| WebKit, desktop and tablet, in two halves        | passed, one test at its second attempt | 14.1 and 16.3           |
| WebKit, the phone, in two halves                 | passed                                 | 13.5 and 13.5           |
| WebKit, the iPhone, upright and sideways         | passed                                 | 16.6                    |

**It was the page that never comes, a tenth time, and it cost half a minute where it had cost two.**
`howto.spec.ts`, "is shown one moment after another, and nothing can be tapped until Glim has shown it", as
WebKit's desktop: the test's first line asks for the front door, and nothing comes. The attempt ended after
30.2 seconds with "page.goto: Timeout 30000ms exceeded", and the guard's note was with it, as it now is for
a test that fails with a page still owed: "out of time: the last page asked for had not been read yet; 1
unanswered: document / (asked for 30.0 s before; the browser reported no answer at all; requests for / that
reached the server after that: at +0.0 s from Macintosh, answered in 0 ms; at +22.2 s from Macintosh,
answered in 0 ms; at +24.7 s from Macintosh, answered in 0 ms); the page stood at about:blank; the test that
had the browser before this one: [webkit-desktop] a grown-up is helping › answers given before and after it
was on are still the child's own". The two later requests are other tests' in the other worker: every test
asks for `/`. At its second attempt the page came in a third of a second. **Still not explained**: ten
times in ten tests after ten different tests, always a test's first page, always CI's WebKit, and each time
the server has the request and answered it at once. What has changed is the cost, which is what the limit
was for: that job's 322 tests took 12.9 minutes. Only that one report was fetched; the other eleven are the
size a report is when nothing was run twice.

**Run 54** is `main` after the owner merged pull request #15 (`64a507b`), at 15:19:15 UTC: 38 minutes after
run 53 went green. **All thirteen jobs passed**, in 20.7 minutes. Ten artifacts are between 0.53 and 0.76 MB;
Chromium's desktop and tablet, first part, is 2.9 MB, and WebKit's desktop and tablet, first half, is 14.5 MB.
**Two tests passed only at a second attempt**, and both were read. One is the page that never comes. **The
other was a fault in the game.**

| Job                                              | Result                                 | The whole job (minutes) |
| ------------------------------------------------ | -------------------------------------- | ----------------------- |
| Lint, types, unit tests, build                   | passed                                 | 2.0                     |
| Chromium, desktop and tablet, in three parts     | passed, one test at its second attempt | 20.7, 17.9 and 10.5     |
| Chromium, the phone, in two halves               | passed                                 | 16.6 and 16.6           |
| Chromium, the small phone and the phone sideways | passed                                 | 12.3                    |
| Chromium, the Pixel, upright and sideways        | passed                                 | 13.9                    |
| WebKit, desktop and tablet, in two halves        | passed, one test at its second attempt | 13.3 and 14.8           |
| WebKit, the phone, in two halves                 | passed                                 | 13.3 and 13.3           |
| WebKit, the iPhone, upright and sideways         | passed                                 | 14.4                    |

**In WebKit it was the page that never comes, an eleventh time.** `garden.spec.ts`, "how many, at a glance:
asked to be told again before the look is over, starts over with the look still to come", as WebKit's desktop.
The test's first line asks for the activity by its address, and nothing comes: "page.goto: Timeout 30000ms
exceeded", and with it the guard's note: "out of time: the last page asked for had not been read yet; 1
unanswered: document /world/number-garden/play/ng-glance-01 (asked for 30.0 s before; the browser reported no
answer at all; requests for /world/number-garden/play/ng-glance-01 that reached the server after that: at +0.0
s from Macintosh, answered in 1 ms; at +2.2 s from Macintosh, answered in 1 ms); the page stood at
about:blank; the test that had the browser before this one: [webkit-desktop] how many, at a glance › asking to
be told again in one step takes nothing from the next". The second request is another test's, in the other
worker: the tests of that activity all begin at that address. At its second attempt the page came. **Still not
explained**: eleven times in eleven tests, always a test's first page, always CI's WebKit, and each time the
server has the request and answered it at once. It cost half a minute, which is what the limit is for.

**In Chromium it was the globe, and the globe was wrong.** `globe.spec.ts`, "turning the globe: two buttons
turn it a step at a time, and they are not answers", as the desktop. The test presses the button that turns
the globe to the left and waits for the globe to have looked 40 degrees to the left of where the question is
asked from. It never did. What the page wrote down of where the globe looked, after the press:

```
-22.1  -27.9  -33.1  -37.8  -41.9  -45.5  -48.6  -46.8  -45.0  -43.3  …      (it was sent to -61.2)
```

Seven frames of a turn that starts fast and slows, a sixtieth of a second apart, and then the globe going
back the way it came, at the pace of the turn it makes by itself when a pin has gone out of sight. **The
cause was in how that turn back was timed.** A turn by a button takes a third of a second; where it leaves a
pin out of sight the globe waits 1.6 seconds and turns back, so that a child can look round the world and
never lose the question. The wait was counted from the press, as one timer of 1.92 seconds, the turn and the
wait together. A page that stops for two seconds in the middle of the turn, as a machine with something else
to do stops one, wakes with the timer already due and the turn not yet finished; and where the browser
attends to the timer first, the globe goes half-way and comes back.

**It was shown before it was mended.** A script pressed the button, stopped the page a tenth of a second into
the turn for 2.1 seconds, and wrote down where the globe looked. On the build before the change, three times
of three, the globe got as far as -49.3 and turned back: CI's numbers, but for where the first frame fell.
With a stop of 1.5 seconds, shorter than the timer, it finished the turn. With no stop it finished the turn.
On the build after the change, with stops of 2.1 and 3.5 seconds, it finished the turn every time.

**The change** (`GlobeBoard.tsx`): whether a pin has gone out of sight is asked when the globe has got where
it was sent, and the wait before it turns back is counted from then. A turn that something else takes over (a
finger, another press) is followed by nothing, as before. A turn with nothing in its way takes exactly as
long as it did.

**The test for it** stops the page in the same way, for longer than the turn and the wait together, and holds
three things: the globe gets where it was sent; it had begun to turn before the page stopped; and it is left
there for the whole of the wait. With the change taken out it fails as a desktop with CI's own picture ("-23.8
-29.4 -34.5 -39.0 -43.0 -46.4 -49.4 -47.8 -45.9 -44.1 …"), and as a phone the other way the race can go: the
globe does arrive, in the frame the page wakes in, and leaves 8.5 thousandths of a second later. With the
change it passed six times of six. **The test's own first draft had a race in it, which its first run as a
phone found**: it asked whether the globe was back where it started straight after the press, when the globe
had not yet begun to turn and was still there. It now waits for the globe to have got where it was sent
before it asks anything else, as the older test's helper does.

**This fault is live**, from the merge of pull request #15 until the pull request this came with is merged.
What a child loses by it is one turn of the globe, on a device that stops at the wrong moment; the next
press turns it. The older test was right to fail, and was not changed.

**Run 55** is the first run on pull request #16 (`ff229a3`: Explorer Harbor's room for making a story, and
the globe's turn mended). **Twelve jobs passed and one failed**, in 18.0 minutes: WebKit's phone, first half.
Ten artifacts are between 0.63 and 0.86 MB; Chromium's phone, first half, is 5.8 MB, and the failed job's is
13.0 MB. **One test failed at both of its attempts, and one more passed only at its second.** Both were
read. The first was the fault of the test, which was new in this run. **The second was a fault in the
grown-ups' page, which is live.**

| Job                                              | Result                                                  | The whole job (minutes) |
| ------------------------------------------------ | ------------------------------------------------------- | ----------------------- |
| Lint, types, unit tests, build                   | passed                                                  | 1.7                     |
| Chromium, desktop and tablet, in three parts     | passed                                                  | 16.6, 15.1 and 15.3     |
| Chromium, the phone, in two halves               | passed, one test at its second attempt                  | 17.5 and 17.9           |
| Chromium, the small phone and the phone sideways | passed                                                  | 13.0                    |
| Chromium, the Pixel, upright and sideways        | passed                                                  | 14.9                    |
| WebKit, desktop and tablet, in two halves        | passed                                                  | 13.7 and 17.9           |
| WebKit, the phone, in two halves                 | **the first failed**: one test of 299, at both attempts | 13.0 and 13.8           |
| WebKit, the iPhone, upright and sideways         | passed                                                  | 16.8                    |

**It was the first time Safari's engine drew the room for making a story, and nothing of the room failed.**
As a phone it ran twelve of the room's tests and passed them all: among them the page turned by a leaf, going
on and going back, in 45 seconds; the three small pages; the room with the sound off; and the room where
nothing is to move. (The room's others are passed over there as they are written to be: the measurements made
once, as Chromium's touch phone, every way through a story, and the keyboard's.) **And the page that never
comes did not happen**, for the first time since run 50: every WebKit report but the failed job's is the size
a report is when nothing was run twice, and the failed job's holds the globe's test and nothing else.

**What failed was the test written for the globe's mended turn, and the fault was the test's.**
`globe.spec.ts`, "a turn by a button is finished however long the page stops in the middle of it, and the
wait before it turns back begins when it has got there", as WebKit's phone, at both attempts: "Expected: > 2,
Received: 2". The test stopped the page a tenth of a second after the press, and held three things. The
second, that the globe "had begun to turn before the page stopped", it put as a number: at least three places
looked at before the one it was sent to. That is a statement about how fast a browser draws. Chromium here
draws six pictures in a tenth of a second. WebKit, as a phone (three dots of the screen to each point, drawn
without a graphics card) on CI's machine, drew two, both times. The globe then got where it was sent, in the
next picture: the game did what the test was written to show, and the test stopped before it asked.

**It was met here before it was changed.** With the processor slowed (below), as a phone, the globe looked at
6, 6 and 6 places in the first tenth of a second of a turn at this machine's own speed; at 5, 5 and 4 with
the processor four times slower; and at 2, 1 and 2 with it eight times slower. The test as it was pushed
passes here until the processor is 24 times slower (on a slow machine the timer that stops the page is late
too), and then fails in CI's words: "Expected: > 2, Received: 2".

**The test now stops the page when it sees the turn under way**: the first time the globe has looked
somewhere after the press and is not yet where it was sent. However many pictures a browser draws, that is
the middle of the turn. It holds that the page did stop there, and for longer than the turn and the wait
together; and then, as before, that the globe got where it was sent and was left there for the whole of the
wait. With the processor 24 and 32 times slower it passed four times of four at each. **With the mend taken
out of the game it fails**, on both screens, at the wait: the globe left 35 and 11 thousandths of a second
after it arrived, where 1.55 seconds is the least. It still tells the mended game from the one that is live.

**The browser tests can be given a slower processor**: `SLOW_CPU=8 npx playwright test …` gives every page one
an eighth as fast, through Chromium's own tools (it does nothing in WebKit). It is for meeting here what is
otherwise met only in CI: a test that counts on something having happened "by now".

**In Chromium it was the grown-ups' page, and the page was wrong.** `grownups.spec.ts`, "save a copy, erase
everything, load the copy: the progress comes back exactly", as the phone. The test finished an activity,
opened the grown-ups' area and read what the page said of the skill, once: 'Expected substring: "3
independent successes". Received: "… Not yet observed · Nothing recorded yet."' At its second attempt it read
"3 independent successes". **The page drew its list of skills before it had read the record**: from an empty
one, for the moment the reading took. For that moment it said "Not yet observed" and "Nothing recorded yet"
of every skill, of a child who might have played for a month. It has done so at every opening since phase
01, and it is live. Nothing is lost by it, and the page puts itself right in a moment; but it is a statement
about a child that nobody has checked, on the one page whose purpose is to say only what the record shows.

**The change** (`src/parent/Evidence.tsx`, which is that part of the page in a file of its own): the page
says nothing of any skill until the record has been read and the list of skills fetched ("Reading what has
been recorded…"), and says when what is there is all there will be (`data-settled`, as a world's page does).
If the record cannot be read it says that, and nothing of any skill: before, a record that could not be read
was shown as an empty one. And the record is read again when a copy is loaded into the player who is being
shown: before, the list stayed as it was until the page was opened again. Six unit tests hold these
(`tests/parent/evidence.test.tsx`). Seven faults were put back one at a time and each was caught, the seventh
after its test was made to look while the second reading was still on its way.

**The tests that read that page wait for it now.** The one that failed reads the page once the page says it
has read the record. Two others had a weakness of the same kind that had never shown: the test of the
page's width on a small screen, and the accessibility check of the page for a player, measured and checked a
page whose list of skills might not have come yet. Each now waits for the list, so the 81 skills and what is
said of them are among what is measured and checked.

**Run 56** is the run on that push (`d851e16`). **Twelve jobs passed and one failed**, in 21.7 minutes:
WebKit's desktop and tablet, second half. Ten artifacts are between 0.64 and 0.88 MB; the failed job's is 2.8
MB, and Chromium's desktop and tablet, second part, is 4.1 MB. **The two things run 55 found are put right
there**: WebKit as a phone passed the rewritten test of the globe's turn, and no test of the grown-ups' page
needed a second attempt. **One other test failed at both of its attempts, and one more passed only at its
second.** The first was the fault of the test. The second is not explained.

| Job                                              | Result                                                   | The whole job (minutes) |
| ------------------------------------------------ | -------------------------------------------------------- | ----------------------- |
| Lint, types, unit tests, build                   | passed                                                   | 1.8                     |
| Chromium, desktop and tablet, in three parts     | passed, one test at its second attempt                   | 21.7, 17.4 and 15.3     |
| Chromium, the phone, in two halves               | passed                                                   | 15.3 and 17.9           |
| Chromium, the small phone and the phone sideways | passed                                                   | 14.2                    |
| Chromium, the Pixel, upright and sideways        | passed                                                   | 15.5                    |
| WebKit, desktop and tablet, in two halves        | **the second failed**: one test of 331, at both attempts | 15.2 and 18.1           |
| WebKit, the phone, in two halves                 | passed                                                   | 13.7 and 15.8           |
| WebKit, the iPhone, upright and sideways         | passed                                                   | 16.8                    |

**What failed measured two towers while one of them was being offered.** `numbers.spec.ts`, "one more each
time: towers stand side by side on every screen, and the gap says nothing until the right tower is in it", as
WebKit's iPad: the tops of the two answer cards were 6.4 points apart at the first attempt and 3.7 at the
second, where less than one is asked. The picture taken at the failure shows why: the first card is lifted and
a little larger than the second. That is what the game does when it asks its question: once the words have
been said, each answer is offered in its turn, lifted six points and grown by a thirtieth for half a second.
The test waited for the page to have arrived and then measured. "Arrived" means that everything moving at
that moment has stopped; the offering had not begun yet, so there was nothing to wait for, and the measuring
that followed was slow enough, on that machine, to fall into the middle of it.

**It was written down before it was changed.** A script opened that step as a tablet and, every tenth of a
second, wrote how far apart the two cards' tops were. For 3.4 seconds after the step appears they are level.
From 3.8 to 4.3 seconds they are between 3.5 and 13.5 points apart. From 4.5 seconds they are level again,
and the step's own script is over at 5.9. So a test that measures within about three seconds of the step
appearing passes, which this one always had, here and in CI; and one that is half a second slower than that
fails. The test as it was pushed, with the measuring made 3.5 and 3.7 seconds late, fails here in CI's words
("Expected: < 1, Received: 3.4"); 3.3 seconds late it passes. Slowing the processor did not show it: that
slows the page's script as much as the page, and it is the test's side that was slow.

**A board now says when it has shown its step**, and the test waits for that. `data-shown` on a board with
answers to choose from, and on a map, the globe, a guess and a robot's row of steps, which all offer what
there is to answer with: it is true once the step's script has run to its end and the board is where it
comes to rest (`over`, from `useScript`), and false from the first frame of a step or of an asking again.
The towers are measured then. Rewritten, the test passes with the measuring made 3.5 seconds late as well.
Seven faults were put back into the marker one at a time, and each was caught: six by the unit tests of when
a run is over, and the seventh (a board that always says it has been shown) by a new browser test, which
holds the page's clock, moves it on, and watches the board say "not shown", offer its answers, and only then
say "shown", never both at once. **The other tests that measure a page after it has "arrived" were read for
the same race.** Only this one compared two answers with each other; the rest ask that things fit the
screen or are at least so large, and an answer being offered is larger, not smaller. They were left as they
are.

**In Chromium an activity stayed at "Getting ready…" for ten seconds, once, and that is not explained.**
`memory.spec.ts`, "keep it for next time: begins the next sitting, after the page has been loaded again, by
asking for what was kept", as the desktop. The test plays a sitting, moves the page's clock on by a quarter of
an hour, loads the page again and then asks for the activity by its address. The activity never appeared:
ten seconds later the page still said "Getting ready…", and the test gave up. At its second attempt the
activity opened at once. Opening an activity waits for three things in turn (the world's content and the code
that draws it; the store on the device; the sitting, found or begun in that store), and nothing on the page
or in the report said which. **It did not happen here**: that test passed 20 times of 20, with four at once
and with the processor six times slower; and a script that did only the loading again and the asking, 90
times, with the clock installed and without, never took more than 1.2 seconds to have the activity open.

**So the next one will say.** An activity that is being opened now writes on the page what it is waiting for
(`data-opening`: its content, the store, or the sitting), and takes it off when it is open. A test that fails
with an activity still being opened reports that, in words, with every request that had been asked for and
not answered: until now the tests said so only when they ran out of time, and this one had not; it had been
refused by a single check after ten seconds. A browser test holds a world's content back and reads the
word; three unit tests hold the words.

**Run 57** is the run on that push (`f7c83bb`). **All thirteen jobs passed**, in 21.5 minutes, WebKit's
desktop and tablet among them, so the towers are measured rightly in Safari's engine too. Eleven artifacts
are between 0.63 and 0.87 MB. The twelfth, WebKit's desktop and tablet, first half, is 22.3 MB: **one test
passed only at its second attempt**, and it was the fault of the test.

| Job                                              | Result                                 | The whole job (minutes) |
| ------------------------------------------------ | -------------------------------------- | ----------------------- |
| Lint, types, unit tests, build                   | passed                                 | 1.8                     |
| Chromium, desktop and tablet, in three parts     | passed                                 | 21.5, 14.0 and 12.6     |
| Chromium, the phone, in two halves               | passed                                 | 18.0 and 17.4           |
| Chromium, the small phone and the phone sideways | passed                                 | 14.8                    |
| Chromium, the Pixel, upright and sideways        | passed                                 | 15.2                    |
| WebKit, desktop and tablet, in two halves        | passed, one test at its second attempt | 14.8 and 16.6           |
| WebKit, the phone, in two halves                 | passed                                 | 13.3 and 14.8           |
| WebKit, the iPhone, upright and sideways         | passed                                 | 15.2                    |

**The test asked luck for something, and gave it eight goes.** `inventor.spec.ts`, "a shelter from the
wind: a wall that stands and is too low lets the wind over the top", as WebKit's desktop. A sitting of the
shelter draws three benches from ten. The test is about one of the ten, and it played sittings until that
one came, giving up after eight: "the low wall in a breeze came up: expected true, received false", with the
page at "All done!" at the end of the eighth. At its second attempt the bench came.

Three of ten means a sitting misses a given bench seven times in ten, and eight sittings in a row miss it
0.7⁸ of the time: **5.8 times in 100**. That is the arithmetic; and 200,000 trials of eight sittings, each
planned with the game's own shuffle from a seed drawn at random, missed it 5.7 times in 100. The test runs
on four screens in every CI run, so about one run in five should have had it pass at a second attempt, and about one in seventy-five should
have failed outright. Nothing was the matter with the shelter, the game or the
browser, and nothing was slow.

**The test no longer waits for luck.** A sitting's seed is one number from the browser's random source.
`e2e/sittings.ts` finds the first seed whose sitting brings, as the first step done alone, a step the test
says it is about, by planning sittings exactly as the game does (`createSession`), and has the page plan its
sittings from that seed (the pinning was already in Robot Ridge's tests of its largest boards, and is shared
from there now). The test says what it expects to have met, so it fails by name if the content or the
planning changes. **Twenty runs of the test then each found the bench in its first sitting**; and with the page
pinned to a seed whose sitting has no such bench, the test fails in CI's own words. The helper has five unit
tests (every step of every pool can be had; it is the first seed that brings it; it says so when nothing
does), and eight faults put into it were each caught.

**The other test of the same kind was changed with it.** The balance's bench with six parts was waited for
over five sittings. Four of its eight benches have six parts and three are drawn, so a sitting misses with
four chances in 56 and five sittings in a row with about two in a million: it never failed, and it was the
same mistake. It plans its sitting from a seed too.

**Run 58** is the run on `main` after the owner merged pull request #16 (`cbadaa3`, whose tree is `f7c83bb`'s).
**All thirteen jobs passed, and no test needed a second attempt**: the twelve reports are between 0.61 and
0.86 MB, the size of a report with nothing in it but the summary. The whole run took 18.8 minutes. The page
that never comes in CI's WebKit did not happen, as it has not since run 54.

| Job                                              | Result | The whole job (minutes) |
| ------------------------------------------------ | ------ | ----------------------- |
| Lint, types, unit tests, build                   | passed | 2.3                     |
| Chromium, desktop and tablet, in three parts     | passed | 18.7, 14.6 and 12.4     |
| Chromium, the phone, in two halves               | passed | 17.4 and 18.0           |
| Chromium, the small phone and the phone sideways | passed | 15.0                    |
| Chromium, the Pixel, upright and sideways        | passed | 15.0                    |
| WebKit, desktop and tablet, in two halves        | passed | 13.1 and 17.7           |
| WebKit, the phone, in two halves                 | passed | 13.7 and 15.8           |
| WebKit, the iPhone, upright and sideways         | passed | 15.2                    |

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

## What the unit tests cover (Vitest, 2724)

| Area                                                               | Files                                                                                                                                                                                                                                           | What is proven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine                                                             | `tests/engine/*` (3)                                                                                                                                                                                                                            | Seeded randomness is stable; a sitting is planned, resumed and finished deterministically; wrong answers, hints, reveals, re-probes and double submissions behave as specified; a property test plays lessons with arbitrary taps and they always end; evidence rules, including "watching, hints and second tries never count" and "one success per challenge per day"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Content                                                            | `tests/content/packs.test.ts`                                                                                                                                                                                                                   | The shipped pack passes the schema and every lint rule; every lint rule is shown to fire on a deliberately broken copy; a test fails if a rule is added without such a case                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Storage                                                            | `tests/storage/*` (4)                                                                                                                                                                                                                           | One contract suite against IndexedDB (fake-indexeddb), localStorage and memory drivers; atomic batches; insert-only attempts; migrations including an interrupted one and data from a newer version; export/import round trip, damage, wrong owner, idempotent merge; fallbacks when storage is refused                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Game                                                               | `tests/game/*` (2)                                                                                                                                                                                                                              | The lesson runner saves, resumes, survives a failed save and a second tab; the counting pictures never overlap or leave their box for 1–10 things                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Shell                                                              | `tests/app/*` (6), `tests/parent/*` (1)                                                                                                                                                                                                         | Router parsing and addresses; settings and their fallbacks; audio unlock, mute and unavailable audio; quality-tier choice; diagnostics; control components; the wording of evidence shown to grown-ups                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Build and server                                                   | `tests/config/*` (2)                                                                                                                                                                                                                            | `vercel.json` as compiled by Vercel's own route compiler: rewrites, 404s, headers, cache rules; the service worker's policy against a fake Cache API, including the `Vary` case found in a real browser                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Layout of the hub** (Phase 02, and the second look of Phase 03)  | `tests/render/archipelago.test.ts`                                                                                                                                                                                                              | For twenty-five screen shapes. Eight are what a phone's or tablet's browser leaves a page according to the device profiles (an iPhone 13 at 390×664 and 750×342, an iPhone SE at 375×553 and 667×331, a Pixel 7, a small Android, an iPad). Seven more are phones held sideways as they really are: three iPhones with their notch and home bar taken off, and four Android phones with their browser's bars taken off, down to 640×256. For each: the right arrangement is chosen, the single row on the flattest; every island is inside the free part of the screen; every tap area is at least 96 pixels square, except on the two narrowest phones held sideways, where it is 90 and 81 wide; no two overlap; the lighthouse is never inside one; the guide, boats, rocks and clouds are clear of every island and every name; a name in a row never reaches its neighbour's; the camera's target agrees with the arithmetic                                                   |
| **Island models** (Phase 02)                                       | `tests/render/islands.test.ts`                                                                                                                                                                                                                  | Each of the seven models stays inside the room the layout gives it, followed through the motion of its moving parts; is modelled rather than a placeholder; is under 40,000 triangles at every tier and lighter on the lowest; stores each corner once; builds identically every time                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **The hub's pictures** (Phase 02)                                  | `tests/render/sprites.test.ts`, `hubPicture.test.tsx`                                                                                                                                                                                           | The committed pictures were rendered from the models as they are now (a hash of the sources); one for every island and floating thing, the right size, not too heavy; the page puts each where the layout says, far islands first, and lifts the one pointed at                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **The guide** (Phase 02)                                           | `tests/ui/guide.test.tsx`                                                                                                                                                                                                                       | A pose for every state; hidden from assistive technology; points with the arm on the right side and by the right angle; unique gradients when two are on a page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Assets** (Phase 02)                                              | `tests/config/assets.test.ts`                                                                                                                                                                                                                   | Everything in `src/assets` and `public` is in the manifest; every listed path exists; nothing from elsewhere lacks a source, a holder and an allowed licence; no shipped file contains the address of another site                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **The lesson's scripts** (Phase 03)                                | `tests/game/lessonScript.test.ts`                                                                                                                                                                                                               | What Glim shows for each thing that can happen: a demonstration counts the group, then its match, then lights them; a guided step is put and counted; a step alone is put and nothing more; a right answer plays the same notes on both sides, a wrong one a different number and never "the same"; no script shows the answer of a step being asked; every script runs forward in time and ends within eight seconds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Sound on a phone** (Phase 03)                                    | `tests/app/audio.test.ts`                                                                                                                                                                                                                       | The cue of the touch that woke the audio plays when it wakes, and is dropped if that takes too long; nothing waits once sound is off; counting notes climb and stop at the top of the scale; every motif is short and quiet; Safari is asked to treat the sound as media, and a browser without that setting, or one that refuses it, is left alone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Small hands** (Phase 03)                                         | `tests/app/touch.test.ts`                                                                                                                                                                                                                       | **A resting finger:** a long press opens no browser menu over the game for touch or pen; a mouse keeps its right click; what is written for grown-ups and anything typed into keep theirs. **More than one finger:** a tap made while a thumb rests on the screen, or during which another finger lands, is answered once; nothing is added when the browser answers it itself, and a click the browser sends late for it is dropped; the thumb that was resting presses nothing; nor does a finger that slid away or that the browser took for scrolling; nothing disabled, covered or gone is pressed; fields, a mouse and a pen are left alone; it makes no difference which way round the browser reports the last finger lifting. **A slow press:** one quick finger is left entirely to the browser; a press of between a third of a second and a second is answered once, and not at all if the browser answers it; a finger that stays longer than a second presses nothing |
| **Things a child makes** (Phase 04)                                | `tests/engine/tasks.test.ts`, `robot.test.ts`, `models.test.ts`                                                                                                                                                                                 | Each kind of task is judged by its rule: what is right, which parts of a wrong try were right, what counts as done cleanly, and that a malformed answer changes nothing. The robot's interpreter stops at a rock and at the edge, and the solver finds the shortest row. Each toy model gives the same result every time, and changing one part changes the result as the model says                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Every world's content** (Phases 05 to 10)                        | `tests/content/*Rules.test.ts`, `generated.test.ts`, `robotJourneys.test.ts`                                                                                                                                                                    | Each pack passes its world's rules; each rule fires on a copy of the pack broken to make it; a test reads each rules file and fails if a rule has no such case. Each pack is byte for byte what its generator writes. Counts the documents quote are pinned: letters taught, words read, stories, maps                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **The voice** (Phase 04)                                           | `tests/config/voice.test.ts`, `tests/app/voice.test.ts`                                                                                                                                                                                         | Every line that can be said has a recording, and nothing else does; no recording has changed since it was made; none was heard as other words. The narrator says one line at a time, stops when told, forgets a failed download and remembers an undecodable file, and reports a line that will not be heard as taking no time                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Pictures and words** (Phase 05)                                  | `tests/game/pictures.test.ts`, `explorerHarbor.test.ts`                                                                                                                                                                                         | The picture kit, the lexicon and the drawn letters agree; every word to be read is spelt as it sounds from letters that have a shape. The storybook and its drawings are the same set; the maths of a map says land only well inside a shore                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **What each world shows** (Phases 05 to 10)                        | `tests/game/readingCove.test.ts`, `memoryForest.test.ts`, `explorerHarbor.test.ts`, `robotScript.test.ts`, `robotRun.test.ts`, `inventorIsland.test.ts`                                                                                         | Each world's scripts, as pure data: a word is said slowly before it is asked about; things to remember are uncovered, covered, and only then asked about, and never uncovered again for the asking; a story is told as far as it goes and told back in order; a robot's run is the frames the interpreter gives                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **What has been finished** (after the six worlds)                  | `tests/game/progress.test.tsx`                                                                                                                                                                                                                  | A page that is the first thing opened finds out who is playing by itself, once, and then says what they have finished; on a device nobody has played on it says nothing and stays so; the next thing to do in a world, and on the map                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Asking again** (after the six worlds)                            | `tests/game/again.test.tsx`                                                                                                                                                                                                                     | It belongs to one step, and the next starts as if nothing had been asked; an asking that comes before a showing is over starts the step again and is not "again"; the event of a tap is not taken for "not yet"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Music** (Phase 11)                                               | `tests/engine/music.test.ts`, `tests/content/musicLabRules.test.ts`, `tests/game/musicLab.test.tsx`, `musicRoom.test.tsx`, `tests/app/audio.test.ts`                                                                                            | Notes and their pitches; a tune's shape; keeping time, as sums; the Music Lab's 32 rules; what is played and in what order; the instruments' make-up and timing; the room to play in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **What the browser tests decide by** (after the six worlds)        | `tests/config/e2eDiagnosis.test.ts`                                                                                                                                                                                                             | WebKit's words for a download it would not begin are recognised, cut short or whole, nothing else is taken for them, and they count as this site's only for an address on it; what a page left undone (a download cancelled, or in WebKit never begun) is held against a test only while no other page has been asked for since, whichever the browser reports first; the preview server notes each page as it arrives and again when it has answered, and nothing else, and only when told where; and what a test that ran out of time is told about its page                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Numbers** (Phase 06, second half)                                | `tests/engine/numbers.test.ts`, `tests/content/numberGardenRules.test.ts`, `tests/game/numberScripts.test.ts`, `numberPictures.test.tsx`                                                                                                        | What each of Number Garden's number pictures stands for, and which are refused; every rule for the later questions, with a case that breaks it; what is counted, named and lifted, in order, for a right answer and a wrong one; that a numeral shows no dots, a gap no tower and a bare stone no number until each is found; that nobody in a story overlaps anybody                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **When a script's beats arrive** (Phase 06, second half)           | `tests/game/useScript.test.tsx`                                                                                                                                                                                                                 | A script that opens with something shows it from the first frame; nothing moves for someone who has asked for less movement; **a run is over when the script has come to rest and not a moment before**, is not over from the first frame of a new run, and is over at once where nothing moves (after run 56)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **A dialog** (after the Music Lab)                                 | `tests/ui/modal.test.tsx`                                                                                                                                                                                                                       | A late "closed" from before a dialog was opened again does not close it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **How to play** (Phase 04, the rest)                               | `tests/game/howto.test.ts`, `howtoView.test.tsx`                                                                                                                                                                                                | What a move does, and that one which does not belong to the moment changes nothing; each showing as data (ends in the child's turn, says only recorded lines, no line on top of another, short with the sound or without); on a screen with the clock held, each line said when the one before is over even where the voice wakes late; leaving writes down that the player was shown and keeps their other settings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Help with the screen** (Phase 04, the rest)                      | `tests/game/nudge.test.tsx`                                                                                                                                                                                                                     | Where a tap landed; what is pointed out in each state, and never one answer; three in a row within a time; a press ends it and starts the count again; it goes by itself; the tick once; the line once for a step, and owed if Glim was talking                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Where to begin** (Phase 04, the rest)                            | `tests/game/placement.test.ts`, `tests/parent/whereToBegin.test.tsx`, `tests/game/progress.test.tsx`                                                                                                                                            | What is suggested for what was seen, and nothing for what was not; what is unsaid is not written; Play begins where chosen and comes back to what was passed over at the end; the card keeps what is chosen, moves nothing until a suggestion is taken, and **writes no attempt and no sitting**; who counts as new to the game                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **A grown-up is helping** (Phase 04, the rest)                     | `tests/game/helping.test.ts`, `tests/game/lessonRunner.test.ts`, `tests/app/components.test.tsx`, `tests/ui/modal.test.tsx`                                                                                                                     | Off until said; kept for the visit and not beyond; every answer while it is on written down as helped and none counted as the child's own; asked at each answer; the switch is held to change, either way                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **A shelter, a grown-up's word, a portfolio** (Phase 09, the rest) | `tests/engine/models.test.ts`, `tests/game/inventorIsland.test.ts`, `tests/content/inventorIslandRules.test.ts`, `tests/game/placement.test.ts`, `tests/game/portfolio.test.ts`, `tests/storage/repository.test.ts`, `tests/app/router.test.ts` | The shelter held to set-ups worked out by hand, to its mirror, to its directions, and to refusing what it does not know; where everything in its picture stands and which way it falls, and the same in words; that only where the prop stands against the wind decides a guess, and that walls are mended from both sides; what a grown-up says was tried, said, taken back and kept by every kind of storage; the last thing mended and not the first, nothing drawn that did not work, guesses counted at the first guess; a day in words; two rooms                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Telling after the press** (after run 49)                         | `tests/app/audioUnlock.test.ts`, `tests/app/audio.test.ts`                                                                                                                                                                                      | The audio is awake by the time anything further along a press is given it, and nobody has been told; whoever listens is told once, afterwards, for a run of presses, and again after the next; the engine can be woken without telling and tells when asked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **A globe** (Phase 10, the rest)                                   | `tests/content/globe.test.ts`, `atlas.test.ts`, `explorerHarborRules.test.ts`, `tests/game/globePictures.test.tsx`                                                                                                                              | Where a place is on a ball looked at from far away, whether it faces us, how a finger turns it, and what a land's shape is by itself; the seven continents' outlines held to the world by 51 places on land and 21 at sea; nineteen rules, each with a question that breaks it; fifteen drawings, and words that never name a land                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **A story to make up** (Phase 10, the rest)                        | `tests/content/storymaker.test.ts`, `tests/game/storyTelling.test.ts`, `storyPictures.test.tsx`, `tests/app/router.test.ts`                                                                                                                     | Five turns, and what is offered at each; every way through walked to its end, 72 of them; a line for every page of every one, the same in the game as in the voice's list; what is shown and said after each choice, with a voice and with none, and nothing to choose from while a page is told; 216 pages each with its picture, glad then worried then glad, and no two things chosen between drawn alike                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **What a player has shown, once it has been read** (after run 55)  | `tests/parent/evidence.test.tsx`                                                                                                                                                                                                                | Nothing is said of any skill until the record has been read: not that nothing is recorded, and not what was read for the player before; what the record holds is said once it is; a copy loaded into the same player is read, and what was on the page stays until it has been; a record that cannot be read is said to be that, and is not shown as an empty one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Days, and when a skill comes back** (Phase 12)                   | `tests/engine/days.test.ts`, `review.test.ts`                                                                                                                                                                                                   | A day is a whole number and back, for every day from 1900 to 2200, by sums that agree with the platform's calendar; the wait for each thing the record can say, and what days of trouble do to it; a day or two ahead is today, further ahead is not counted from and is said to be in doubt; and of any record: the same answer in any order, nothing due on a day it was practised, what is due stays due, and help never makes a thing count as done alone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Luck** (Phase 12)                                                | `tests/engine/chance.test.ts`, `clean.test.ts`                                                                                                                                                                                                  | How likely a blind answer is to be right, for every challenge there is by its kind; how likely a run was to come out so well by chance; that each first try with no hint says its own chance; what two, three and more pictures ask of a run before "so far" and before "across days" is said, on both sides of each line; and that pairs found in more turns than a board allows are right, marked, and count as a first try alone that was not a success                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **The concept graph** (Phase 12)                                   | `tests/engine/graph.test.ts`, `tests/content/concepts.test.ts`                                                                                                                                                                                  | The audit finds each kind of fault it knows, put into a small graph, and nothing in a sound one; the file is what the build writes from the packs, to the last entry; nothing in the real graph is out of reach; the skills that fall short of three presentations, the one with a single question and the five asked only at times are named; a concept in full is there for every skill                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **What Play offers next** (Phase 12)                               | `tests/engine/recommend.test.ts`, `tests/game/advice.test.tsx`                                                                                                                                                                                  | Something new is the first unfinished activity whose skills build on things done alone, and one that is not ready is passed over, said to be, and offered when nothing else is; something played before comes back by its wait, the longest-waiting first, never on the day it was played; seven in ten over the last ten; one trouble a day, and never first; a place a grown-up chose, and what is taken on their word; a calendar that has moved; and of any record, that every world has something to play and says why. The hook: nothing said until it is known, never one player's for another, nothing where it cannot be had                                                                                                                                                                                                                                                                                                                                               |
| **Five made-up learners** (Phase 12)                               | `tests/engine/learners.test.ts`, `tests/helpers/learners.ts`                                                                                                                                                                                    | Six weeks of the real lessons by the real rules, twice each: everybody is offered something every time and plays it to the end; nothing is offered twice in a day while there is anything else; nobody is kept on one thing; a learner who taps without looking is never called independent where luck has no part, and hardly ever where it has; one whose finger slips is shown as knowing less than they do, and is not shut out                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Old data brought up to date** (Phase 12)                         | `tests/storage/pairsMark.test.ts`, `properties.test.ts`, `repository.test.ts`                                                                                                                                                                   | The turns each board of pairs allowed are the lesson's own; an old answer is marked when it should be and never otherwise, once; a saved copy from before is marked on the way in; and of whatever was stored: one player's record is theirs alone, a copy saved and loaded back is the record to the letter, a copy makes a part of the record whole, and bringing data up to date says no more of a child than it said before                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **A sitting, and the clock of an answer** (Phase 12)               | `tests/game/sitting.test.tsx`, `playClock.test.tsx`, `tests/parent/whereToBegin.test.tsx`                                                                                                                                                       | Only time in play is added; half an hour away, or a clock gone back, begins another sitting; storage that is blocked or holds something else means nothing has been played; time to rest comes when the length a grown-up chose has been played and never where they chose none; two changes made quickly are both kept. The clock an answer is timed by stands still while paused and goes on from exactly where it stood. A page drawn by the sitting is told within a minute when it ends by itself, and at once when it comes back into sight; nothing is left running or listening when the page has gone                                                                                                                                                                                                                                                                                                                                                                      |
| **Why, in words** (Phase 12)                                       | `tests/parent/why.test.ts`, `nextUp.test.tsx`, `evidence.test.tsx`                                                                                                                                                                              | A sentence for every reason there is, none of which says anything of a child but what was done; skills by their names and never by their ids; how the two piles were mixed, with the numbers gone by; what can be said of luck, and when nothing is; the card says nothing until it is worked out, and says so when it cannot be                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **A wall with no prop** (Phase 12)                                 | `tests/engine/designNone.test.ts`                                                                                                                                                                                                               | "None" is read back as one choice and not as nothing; in a gust such a wall goes over, which is a wrong answer and not no answer; a sitting takes it and writes it down                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **The seed a browser test plans from** (after run 57)              | `tests/config/e2eSittings.test.ts`                                                                                                                                                                                                              | Every step of every pool can be had as the first done alone; the seed given is the first that brings it; it says so, by the activity's name, when nothing does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## What the browser tests cover (Playwright, against the production build)

The build is served by `vite preview` with the `vercel.json` rules applied, so the tests run under the production
Content-Security-Policy, headers and routing.

**Every test also fails on:** any console error or warning, any uncaught exception, any failed request, any HTTP
status of 400 or more, and any request to another origin. (One thing passes on its own: a download the browser
cancelled because the page had gone on to load another document, in whichever of its two ways the browser reports
it.) Exceptions are named one by one in `e2e/fixtures.ts`
(software-renderer noise, Playwright's own notices) or in the single test that expects them.

| Project (engine)                                                          | Screen                     | Tests                                                                                                         |
| ------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `desktop` (Chromium)                                                      | 1366×768                   | all 596 (the measurements of what is pressed, and eight tests for a small touch screen, skip themselves here) |
| `phone` (Chromium, touch)                                                 | 390×844                    | all 596 (keyboard journeys, and the activities played to their ends, skip themselves here)                    |
| `phone-landscape`, `tablet`, `small-phone` (Chromium, touch)              | 844×390, 768×1024, 360×740 | the 61 layout tests each                                                                                      |
| `android`, `android-landscape` (Chromium as a Pixel 7)                    | 412×839, 863×360           | the 61 layout tests and the 4 journeys each                                                                   |
| `webkit-desktop`, `webkit-phone` (WebKit)                                 | 1366×768, 390×844          | all 596 each, in CI only (what needs the 3D scene or the service worker skips itself)                         |
| `iphone`, `iphone-landscape`, `ipad` (WebKit as an iPhone 13 and an iPad) | 390×664, 750×342, 810×1080 | the 61 layout tests and the 4 journeys each, in CI only                                                       |

The named devices are Playwright's descriptions of them: the screen the device's browser leaves a page with its
bars showing, its pixel ratio, touch, and its user agent, on a desktop build of the engine. They are not the
devices, and in two ways they are kinder than the devices. For an iPhone held sideways the description is the 750
pixels _inside_ the notch's margins; a page that asks for the whole screen, as this one does, is 844 wide there
and is told which parts to keep clear. And for an Android phone held sideways it is 360 pixels of height, where a
phone 360 pixels wide leaves a page about 264 to 280. `phones.spec.ts` tests both as they are.

| Spec                                         | What it proves in a real browser                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `journey.spec.ts` (Phase 03)                 | **A brand-new child**: the front door (Glim, six pictures, the map behind it switched off), one tap to choose, the map with Glim pointing at the island that is open, its page with the example, the demonstration (nothing answerable; the group and its match lit at the end), five steps answered by looking at how many there are, a calm end, and home with no front door. **Asked once a visit**: a refresh goes straight to the map; a new visit shows that player's picture. **When it does not go right**: a wrong answer is set aside and the remaining choice shown; "show me again" gives nothing away; help comes in two steps; pause covers the board, holds focus, has the two switches, and closes with Escape; a refresh keeps the step, the choice set aside and the help used; leaving for home keeps the place. Tagged `@journey`                                                                                                                                                                                                                                                                                                                                                                              |
| `phones.spec.ts` (Phase 03)                  | **A notch.** With a notch's margins and a home bar's given to the page, nothing a child sees or presses lies in them on the front door, the map, a world's page, the demonstration, a question, the pause sheet or the grown-ups' gate, and the islands still do not touch. Tagged `@layout`, so it runs on every project. **A flat screen** (800×264 and 640×256, about what Chrome leaves a page on an Android phone held sideways): the islands stand in one row, each large enough, none touching, every name whole; Play, "My turn" and the choices are each on the first screen; and the end of the activity fits, clear of the way home, with both its buttons on screen. **Small hands** (Chromium only): real touch sequences, sent through the browser's own touch handling — a tap while a thumb rests on the screen, a tap during which another finger lands, and a slow press by one finger each flip a switch exactly once; an island opens and a question is answered with the thumb where it was. The page's rules against bouncing, reloading on a pull and zooming on two quick taps are read back. **The notch, the flat screen and the two-finger taps all fail on the code as it was before the second look** |
| `shell.spec.ts`                              | Six worlds, laid out for the screen, each a large target wholly on screen with no overlap, names never cut short or off the screen; a world's page shows its own island; real links, Back and Forward, titles, focus; deep links and refresh; not-found; sound and calm-motion toggles work and are remembered; calm motion really stops every animation on the home screen; sound really plays after a touch and stops when muted; keyboard, skip link, focus ring                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `hub.spec.ts`                                | The picture is there first; the 3D scene arrives in its own chunks and draws a real scene (decoded from a screenshot: many colours, paler water far away); it moves gently, and not at all under reduced motion; it is taken down on leaving and rebuilt on return; a lost graphics context, a failed download or no WebGL each leave the picture; on automatic, a software-only renderer keeps the picture; the 3D code is never fetched where it is not used. **The map:** every island answers a tap at five points across it; a tap on a landmark or on a name opens that island; each picture sits exactly under its tap area; the lighthouse goes nowhere; focus lifts an island; Tab reaches the worlds in teaching order; the guide points at the open island, clear of every other, and waves when tapped. **Picture and 3D put every island in the same place.**                                                                                                                                                                                                                                                                                                                                                         |
| `lesson.spec.ts`                             | A new player finishes the activity by looking and tapping; wrong answers are set aside, taught and never counted as independent; help comes one step at a time and is recorded; the guide points, wonders, is glad and is patient at the right moments; a double tap counts once; **a refresh mid-question resumes at the same question with the pictures in the same places**; the activity fits one screen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `grownups.spec.ts`                           | The press-and-hold gate (pointer and keyboard); add, switch, change and remove players; separate records; save a copy, erase, load it back; a damaged or foreign file is refused; settings; diagnostics; fits the screen with the longest names, **with the list of every skill on the page when it is measured**. **A dialog that is cancelled and asked for again at once is there**: pressed in the moment between the dialog closing and the browser saying so                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `resilience.spec.ts`                         | **Lost storage:** wiped between visits, and wiped while the page is open; IndexedDB refused (progress kept in localStorage and survives a reload); all storage refused (still playable, and the grown-up is told); a part that cannot be downloaded shows a calm message and recovers on reload; **an activity that is getting ready says what it is waiting for**, and stops saying it when it is there (its content held back, then let through)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `offline.spec.ts`                            | With the real service worker: what was opened once opens again with no network and progress is kept; a part never opened says so; installing downloads the first screen only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `a11y.spec.ts`                               | axe-core, WCAG 2.1 A and AA rule sets, on the front door (first visit and returning), the hub, world pages, five states of the activity, the pause sheet, the end of an activity, the grown-ups gate, area and a dialog, and the not-found page: no violations. Each check waits for the page to finish arriving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `smoke.spec.ts`                              | Security headers, deep links, cache rules, the installable-app files, and a clean start. Tagged `@smoke`: these are the tests to run against a real deployment. And the tests' own tools, which are not: the guard that every test runs under (what a page left undone is held against, and what is not); the clock a test holds, on a slow machine; and **the time a test is given** (after run 50): a test that passes with more than three quarters of its limit used fails for that, shown by a test built to fail that way and no other                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `everything.spec.ts` (the six worlds)        | **Every activity of four worlds played from its first screen to its last**, by the answers its content says are right, with motion reduced so that only what the game insists on is waited for; and a test that fails if any activity of any world is played to the end by no test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `a11y-worlds.spec.ts`                        | axe-core, WCAG 2.1 A and AA, on every world's page (and again held sideways) and on every activity of those four worlds, while it is shown and while it is asked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `garden.spec.ts`                             | Number Garden's boards: a group taken in at a glance is covered before the choices are turned over, and another look is help; giving one at a time, taking back, and saying when it is done; more, fewer and equal each ask one thing **Asking to be told again in one step takes nothing from the next, and asked before a look is over it starts the step again with the look still to come** (with the clock held); a world's page opened by its own address, and loaded again, knows what has been finished; the button to take one back is the same button all through a count                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `numbers.spec.ts` (Number Garden's numerals) | A staircase's gap has nothing in it until the right tower is stood there, and towers to choose from stand side by side on every screen, **measured when each has been offered and not while one is lifted**; **a board says it has shown its step only once its answers have been offered** (clock held: not shown, offering, and only then shown); a frame is filled only by the group that fills it, and an empty one answered with 0 stays empty; **a numeral shows its dots only while it is counted** (clock held: on the wrong numeral, then on the right one, and at no other time); a number that is said takes no answer until it has been said, and with the sound off says it needs sound; a bare stone has no number until it is found; **a story is shown from its first moment as it stood before anyone moved**, and to someone who has asked for less movement stands as it ends; those who went are faded and are not counted; and each kind of question says in words what it shows and never its answer                                                                                                                                                                                                         |
| `reading.spec.ts`                            | Reading Cove: with sound off an activity shows a gate and starts when it is opened; a sound can be heard again; a wrong picture is answered with its own sound; a printed word is read before its pictures are offered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `words.spec.ts` (Reading Cove's later ones)  | **What a child is helped with and what is left to them**: a word to rhyme with is said beside each choice with support; a word is clapped for a child one clap at a time and none is left standing, and alone nothing is clapped; each place for a letter lights as its sound is said, and alone none does; the picture of the word stands above the places, and a letter that was right in a wrong try stays; two letters that write one sound stand on one tile; a finger goes from word to word under a sentence that is read to a child, and alone the sentence is not read and no finger shows; **what the voice said is listened to, not inferred from what was fetched**; on a phone held upright a sentence is on two lines with its pictures side by side                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `memory.spec.ts`                             | Memory Forest: **nothing that is covered can be read off the page**; the cards to answer with are blank while things are on show; two that differ turn back; an order is shown again only as help; the question about the very start comes last **An order being shown takes no tap until all of it has been shown**: a tap is made in every pause, with the clock held, and none counts; asking again in the middle of an order gives it whole, and takes nothing from the next                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `harbor.spec.ts`                             | Explorer Harbor: a story is put in order and **told back picture by picture, each lifted while its own line is written under it**; a missing picture is nowhere in the page until it is found; **every place on a map is drawn where the content says, with land under it or not as the answer says**; places are 56 points or more and apart, down to 640×256; the boat sails to the island chosen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `robot.spec.ts`                              | Robot Ridge: each of four activities played rightly and wrongly by reading the ground from the screen and solving it; a run pauses and goes on; help; the keyboard; with less motion the way is marked instead of walked; axe on every board; the largest boards on 360×740 and 640×256                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `inventor.spec.ts`                           | Inventor Island: a guess is tested there and then, and one that did not come true is kept beside what happened; a mend tests a change only when something has changed; help; every activity played to the end; standing still where nothing should move; sideways with a notch; axe. **A shelter**: a wall that blows over goes over away from the wind and its prop comes down after it, measured by where their ends are; one that is held stands. **A grown-up's word**: a switch that is held, never tapped; kept with its day, shown as their word on the island's page and in the portfolio, taken back the same way; there for nobody when nobody is playing. **The portfolio**: what is waiting at each bench, each a way in; a bridge that was mended drawn from the answer itself and tested again at a tap; a picture and no more with less motion; five cards set out for the screen, never four and one **A wall with its prop taken away can be tested**: it goes over again and the child is told so. The benches these tests are about are brought first by the sitting's seed, and no longer waited for                                                                                                           |
| `voice.spec.ts`                              | The lines of an activity are fetched from the game's own files when wanted, and said; nothing is fetched with the sound off; a recording that cannot be fetched is done without; the voice stops on pause; every recording is listed for a grown-up, plays, and keeps its mark                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `howto.spec.ts` (the first-visit help)       | **A new player is shown how to play, once.** From the front door; each of the three things done; everything pressed measured on every screen shape; Glim's lines listened to in order. With the clock held, each showing watched one moment after another, nothing answering a tap before it is shown, and the hand coming to what there is to tap. Passed by with the house; shown again after a visit that ended in the middle of it; not shown to a child who was already playing; done with the sound off, and from the keyboard                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `help.spec.ts` (the first-visit help)        | **Taps that land on nothing** bring the ring to every answer alike (or to the one way on) and the words to Glim's bubble; the line is said once; the activity then played to its end records three independent successes. With the clock held: not across a pause in the tapping, gone in a few seconds, "watch first" while choices are turned away, a tick pointed out once. **A grown-up is helping**: held to change, never tapped; answers then recorded as helped; before and after are the child's own; kept for the visit only; can be set on "how to play". **A press that comes as the audio wakes** (after run 49), staged: with the audio changing what it says of itself before every press and the page behind with its drawing, what is pressed is still in the page when the document is given the press, every time in 64 presses or more                                                                                                                                                                                                                                                                                                                                                                         |
| `begin.spec.ts` (the first-visit help)       | **Where to begin**: a suggestion moves nothing until it is taken; Play is then the chosen activity; every activity is still there, none marked done, the first still opens; nothing is written into what the child has shown; kept at the next visit; one player's, not the device's                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `music.spec.ts` (the Music Lab)              | A question that is listened to takes no answer until the last of it has been heard, and no tap in the middle of it; a wrong answer is told only that it was not the one, and it is played again; a beat is kept by tapping the drum in time with the lights, by touch or with a mouse; a steady lateness is not counted against the child, and a beat left alone is not marked as wrong; notes are played back in the order they sounded; any tune of the shape asked for is taken, and one of another shape is left where it is to be changed; the room has the whole octave, lights a bar when it is played and keeps nothing; where the sound is off, what cannot be played by eye says so. The bars and the drum measured on every screen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `sizes.spec.ts`                              | **What a child presses is large enough to press, where there is least room.** One activity for each kind of board, 34 of them, on four screens (844 by 390, 750 by 342, 640 by 256 and 320 by 568): every button and link inside the activity, measured while a question is being asked, is 56 points or more across and down, and none is off the screen. Measured once, as a touch phone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `globe.spec.ts` (Explorer Harbor's globe)    | **Every pin is where the content says its land is, with the globe wherever it has been turned to**; the three pins and the two turning buttons are large enough and clear of one another; the land that is found is lit and looked at, and a famous place is put where it is; a land that is only named has nothing to match until help is asked for; a finger pulls the globe and a pin under the finger is not pressed; a pin pressed straight after a flick is pressed; turned until a pin is out of sight, it cannot be pressed, and the globe comes back; two buttons and the arrow keys turn it, and the keyboard is never left with nothing; **a turn by a button is finished however long the page stops in the middle of it**, the page being stopped when the turn is seen to be under way; held the other way it is laid out again; where nothing is to move it is simply where it should be; and on the flattest phone                                                                                                                                                                                                                                                                                                 |
| `story.spec.ts` (Explorer Harbor's room)     | **A story is made by five taps on pictures, and every line of it is heard in order**; all 24 stories there are for one of the three are made, with what is offered at each turn held to the content; a leaf turns going on and going back, and each line is said over its own page; nothing can be chosen while a page is told, and its room is kept; Glim says a question again, and tells a page again from the top when tapped in the middle of it; three small pages turn the book once the story is whole and not before; with the sound off the pages turn and the words are there, and the sound has a switch; where nothing is to move no leaf turns; the keyboard is never left with nothing; nothing is stored; everything that can be pressed is measured, and the book at every turn of the wordiest story, on the four smallest screens; the accessibility checks at three moments; and on the harbour's page, the switch a grown-up holds to say a story was told back, with every part of the grown-ups' section measured                                                                                                                                                                                           |
| `next.spec.ts` (phase 12)                    | **What Play offers, and when it stops offering.** An activity finished, and something new offered that day; two days on by the page's clock, the same activity offered again and the page saying why; Glim pointing at its world; the grown-ups' card with the activity, its label and every reason, skills by name; the plain order, said to be that, with nobody playing. **A sitting of ten minutes played out**: the end of an activity says so, Glim sleeps on the map and points at nothing, a world's page has no big button and every activity still opens, and half an hour away brings Play back; with no length chosen nothing rests. **A game of pairs in far too many turns** is stored as right and marked, and the activity's own count and the grown-ups' page agree. **An answer given after a pause of five minutes** is stored as having taken seconds                                                                                                                                                                                                                                                                                                                                                          |

## Sizes (`npm run verify:dist`)

| What                                                    | Size (gzip) | Budget   |
| ------------------------------------------------------- | ----------- | -------- |
| Script for the first screen                             | 108.3 kB    | 110 kB   |
| Styles for the first screen                             | 7.5 kB      | 12 kB    |
| Fonts                                                   | 67.2 kB     | 80 kB    |
| The hub's pictures (WebP, not gzipped)                  | 284.0 kB    | 330 kB   |
| 3D hub (on demand)                                      | 260.1 kB    | 290 kB   |
| Largest other on-demand part (Explorer Harbor's code)   | 18.2 kB     | 30 kB    |
| The game: everything but the voice and the content, raw | 2844.1 kB   | 2850 kB  |
| The content: seven packs and the atlas, raw             | 716.5 kB    | 900 kB   |
| The voice: 736 recordings (MP3, not gzipped)            | 9351 kB     | 10500 kB |
| The largest recording                                   | 38.6 kB     | 60 kB    |

A world's code is 4.5 to 18.2 kB and its content 5.4 to 12.4 kB, each fetched on entering that world
(Inventor Island's are 4.5 and 6.0, and its portfolio 1.7, fetched by whoever opens it; Explorer Harbor's
code is the 18.2, with 37 story pictures and fifteen famous places drawn in it; the continents' outlines are
a file of their own beside it, 12.1 kB, counted with the content; and its room for making a story is 12.5 kB,
with its 42 scenes, fetched by whoever opens it); the lesson frame is
9.5 kB and the part of the engine that judges answers and reads the record 7.1 kB, fetched with the first
activity, or sooner by the map or a world's page when there is somebody to choose for; the part that chooses
what to offer is 3.6 kB and the table it goes by 3.2 kB, fetched then too (about 15 kB in all, once, after the
first screen is up; without them Play goes by the plain order); and a recording is fetched when the step that
may say it arrives.

**Two limits were raised for the room for making a story, on purpose.** The game's own code was 2687 kB of
the 2700 it was allowed; the room brought 109 kB (forty-two drawn scenes, three animals, three places, a
book, and the list of 75 more recordings), and the limit is 2850. The voice was 7882 kB of 9000; a story is
told aloud, in 75 lines of up to two sentences, which are 1453 kB, and the limit is 10500. Neither is in the
first load, and neither is fetched by anyone who does not open the room: the reasons are written beside the
numbers in `scripts/verify-dist.mjs`.

**Two of these are worth watching, and one of them is nearly spent.** The game's own code is 2844.1 kB of
the 2850 it is allowed: phase 12 brought 48 kB (the choice, the graph, the reasons in words, a sitting's
clock, a sleeping Glim), and 5.9 kB is left. The parent dashboard of phase 13 will not fit in that; the limit
will have to be raised on purpose, with the reason beside the number, or room made. The script for the first
screen is 108.3 kB of the 110 it is allowed (phase 12 added 1.2 kB: what a world's page and the map need to
ask for the choice, and Glim asleep), and it has grown with every activity: what each world offers, with the grown-ups' words about it, is in it. (Six
more activities in Reading Cove added a tenth of a kilobyte; the first-visit help added seven tenths, for
what a player's settings may now hold and for the front door's knowing who is new. "How to play" itself is a
part of its own, 3.9 kB, fetched only by someone who is shown it.) A larger batch of activities will need those
words moved out of the first load. And the budget for the whole build
is now two budgets, because one had stopped meaning anything: it had been raised twice to let content in, and
Number Garden's numerals went over it again (2942 kB of 2900). Content is meant to grow and has a limit of its
own; what is left is the game itself, and its limit is tighter than the old one.

The verifier also proves, on the built files: one entry script; no 3D code, studio, character sheet, world or
recording reachable from it by static import, nor the part that chooses what to offer or its table; **no two
built files that wait for each other** (new with phase 12, after two did: see _What phase 12 added to the
tests_); no inline script or style (so the CSP holds); no development URL in any file; the manifest and
its icons; and that the service worker pre-downloads exactly the first screen's files and knows every hashed file.

## Screenshots

`docs/review/explorer-harbor-story/` — 34 JPEGs of Explorer Harbor's room for making a story, taken from the
running production build by a script that makes stories in it: the way in from the harbour's page; each of
the five turns of a story about a fox and a kite, on a phone upright (390×844), with the first page being
told, a page half turned, the end, and the story being told again; the first question and a question with
two pictures on a phone sideways (844×390), on the narrowest phone sideways (640×256), on a tablet (768×1024)
and on a desk (1366×768); the end of five other stories, one on each of those and one on the narrowest phone
upright (320×568); a page changing where nothing is to move; and the harbour's page with the switch a
grown-up holds. Then eight sheets drawn straight from the drawings: the three animals and the three places,
all 42 scenes with an animal in each, and every scene at the size it is chosen at on a small phone. At twice
the size. They were looked at, and then measured on nine sizes. **Looking found what no test had**: on the
harbour's page the words for grown-ups were one letter wide (_What Explorer Harbor's room … added_, above).

`docs/review/explorer-harbor-globe/` — 28 JPEGs of Explorer Harbor's globe, taken from the running
production build by a script that plays it: the harbour's page with its six things to do; a land shown and
found, and asked for, on a phone upright (390×844) and sideways (844×390), on the narrowest phone sideways
(640×256), on a tablet (768×1024) and on a desk (1366×768); "Tap one of these", a wrong land, the other side
of the world after two pulls of a finger, and the land found; a land asked for by name alone, with help's
first and last steps; a famous place shown, asked for and put where it is; and two sheets, of the seven
shapes and of the fifteen places. At twice the size. They were looked at, and then measured on nine sizes,
which found what looking had not: _What Explorer Harbor's globe added_, above, and `docs/QUALITY_REPORT.md`.

`docs/review/inventor-island/` — 21 JPEGs of Inventor Island's shelter, of the switch a grown-up holds and of
the portfolio, taken from the running production build by a script that plays them: a guess shown, tested and
come true; a mend shown, from the wall blowing over to the prop that holds it; a child's own guess; the
island's page with all five activities, and with one said to have been tried; the portfolio with nothing in
it, with a bridge mended, and with that bridge being tested again. On a phone upright (390×844) and sideways
(844×390), on the narrowest phone sideways (640×256) and on a desk (1366×768), at twice the size. They were
looked at, and then measured, which found what looking had not: _What Inventor Island's shelter … added_,
above, and `docs/QUALITY_REPORT.md`.

`docs/review/reading-cove/` — 19 JPEGs of Reading Cove, taken the same way, by
`npm run screens -- reading-cove worlds reading-cove`: its page with all sixteen cards, every activity at the
first thing a child does in it, the first while Glim is showing it, and the last, the sentence, on a phone held
sideways. They were looked at, with more that were not kept (every activity at five more sizes, and all
twenty-nine pictures of one thing on or in another on one sheet); `docs/QUALITY_REPORT.md` says what was seen.

`docs/review/music-lab/` — 11 JPEGs of the Music Lab, taken the same way as the six worlds' below, by
`npm run screens -- music-lab worlds music-lab`: its page, every activity at the first thing a child does in it,
the first while Glim is showing it, the last on a phone held sideways, and the room to play in on a phone held
both ways. They were looked at; `docs/QUALITY_REPORT.md` says what was seen.

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

**A tap seen by nothing**, in Safari's engine, twice (runs 48 and 49): explained after the second, under _Run
49_, and put right. It was not the machine: the game told its listeners that the audio had woken in the
middle of a press, the page drew again there and then, and the picture under the finger was replaced before
the press reached the activity. It needs a busy machine to show, which is why it showed only there.

**Two tests out of time** on `main` (run 50): explained under _Run 50_. They took 59.5 seconds of their 60
when they passed. A test now has two minutes, and one that uses three quarters of its limit fails for that.

**Still not explained: the page that never comes.** Eleven times in CI's WebKit, always a test's first page,
never in Chromium, never here: the server answers at once and the browser never reads the answer. It did not
happen in runs 49 or 50; it did in runs 51, 52, 53 and 54, once each. The first two of those cost two minutes
each. A page now has half a minute to come (_Run 51_, above), and the tenth and the eleventh, in runs 53 and
54, cost 30 seconds each and said what they had been waiting for.

**A globe that turned half-way and came back** (run 54): explained under _Run 54_, and put right. It was not
only the machine: the wait before the globe turns back by itself was counted from the press, and a page that
stopped for two seconds in the middle of the turn woke to find the wait over and the turn unfinished. It
needs a page that stops at that moment, which is why it showed only there; a phone can stop a page too.

**A test that measured an answer while it was being offered** (run 56): explained under _Run 56_. Two towers
were asked to stand level, and were measured in the half second in which the game lifts the first of them to
offer it. Here the measuring always came before that; on CI's machine, once, it came during it, at both
attempts. A board now says when it has shown its step, and the test waits for that.

**An activity that stayed at "Getting ready…" for ten seconds** (run 56, in Chromium, after the page was
loaded again): **not explained.** It could not be made to happen here in 110 tries. An activity being opened
now says what it is waiting for, and a test that fails while one is still opening reports it.

**A test that asked how fast a browser draws** (run 55): explained under _Run 55_. A test stopped the page a
tenth of a second into a turn of the globe and asked for three pictures to have been drawn by then; WebKit,
as a phone on CI's machine, had drawn two. The test now stops the page when it sees the turn under way. It
was met here by slowing the processor (`SLOW_CPU`), which the tests could not do before.

**A page that said nothing was recorded before it had looked** (run 55): explained under _Run 55_, and put
right. It was not only the machine: the grown-ups' page drew its list from an empty record for the moment
it took to read the real one, on any device, at every opening. A slower machine made the moment long enough
for a test to read it.

**A test that looked for something after it had been and gone** (run 51): explained under _Run 51_. The
test waited for a state that lasts a second, after a press that on that machine took five to come back. It
holds the clock now and watches the state come and go.

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

**After the owner merged pull request #7** (2026-11-25, `71d66e0`), a few minutes after the merge: Vercel's own
record of the deployment said "Ready"; the service worker the site served was byte for byte the one a local
build of that commit makes; an activity finished on the site showed as finished on its world's page opened by
its own address, where the build before showed nothing finished; after one tap on Glim in "How many, at a
glance" the two steps after it still uncovered their groups, where the build before left them covered; and 52
browser tests passed against the address, as before. The three faults that had been live were gone from it.

**After the owner merged pull request #9** (2026-11-25, `dbbdbc3`), two hours after the merge:
Vercel's own record of the deployment said "Ready". The tests of that commit, not of this tree, were run
against the address (the tests here are ahead of the site by six activities): 60 passed of 60, eight smoke
tests as a desktop and as a phone and 44 as a Pixel 7, which play something in every world, the Music Lab's
room and four of Number Garden's new activities among them. A probe opened "Which has more?" on a phone held
sideways and measured the two groups to choose between: 317 by 241 pixels at 844×390 and 237 by 107 at
640×256, where the build before drew a strip 48 high and 20 high. It counted 18 activities on Number Garden's
page, six and a way to the room on the Music Lab's, and ten on Reading Cove's, which was right then: its six new
ones were not live.

**After the owner merged pull request #10** (2026-11-25, `8288833`), two and a half hours after the merge:
Vercel's own record of the production deployment said "Ready". The tests of that commit, not of this tree,
were run against the address (the tests here go in by "how to play", which is not live): 65 passed of 65, eight
smoke tests as a desktop and as a phone and 49 as a Pixel 7, which play something in every world. Five of
those are Reading Cove's new ones: a rhyme answered wrongly and then rightly, a word clapped one clap at a
time, a word built with each place lit in turn, sh ch th met a pair at a time, and a sentence read with a
finger under each word. A probe counted 16 activities on Reading Cove's page; found "Read the sentence" set on
two lines on a phone held upright, with its shortest word 18 pixels high at 320×568 and 26 at 390×844; and
found that a new player goes from the front door to the islands, as they must: "how to play" is not live.

**After the owner merged pull request #11** (2026-11-26, `ed3efd6`), an hour and a half after the merge:
Vercel's own record of the production deployment said "Ready". The tests of that commit, not of this tree,
were run against the address (the tests here expect seven activities in Robot Ridge, and four are live): 69
passed of 69, eight smoke tests as a desktop and as a phone and 53 as a Pixel 7, which play something in
every world. Among them: "how to play" is where the front door leads, with each of its three things shown and
then done; it is shown one moment after another, and nothing can be tapped until Glim has shown it; it can be
passed by and is not shown again; and in the grown-ups' area Play begins where a grown-up says. The test that
the live fault (above, run 45) makes fail now and then passed there, as it mostly does. No probe was made
beyond those tests.

That is evidence that Vercel serves what was built, with the headers and routing the tests expect, and that the
voice's files arrive. It is not a phone, and nobody has heard those recordings play. Nor is it evidence that
what was built was right: the five faults in _What was found after the six worlds went live_ were on the site
while every one of these checks passed.

**After the owner merged pull request #12** (2026-11-26, `3c322c5`), ten minutes after the merge: Vercel's
own record of the production deployment said "Ready". The tests of that commit, not of this tree, were run
against the address from a clean copy of it (the tests here expect eight activities in Memory Forest, and six
are live): 72 passed of 72, eight smoke tests as a desktop and as a phone and 56 as a Pixel 7, which play
something in every world. Three of those are Robot Ridge's new ones, played through against the site: a long
row made from its end, run a step at a time on and back, and handed in when it is full; a row whose steps are
in two lines; and a bridge that nobody knows about until a run begins, where without the wait the robot is
stopped and with it gets over. No probe was made beyond those tests.

**After the owner merged pull request #13** (2026-11-26, `a0e60f8`), 21 minutes after the merge: Vercel's own
record of the production deployment said "Ready". The tests of that commit, not of this tree, were run
against the address from a clean copy of it (the tests here expect five activities on Inventor Island, and
four are live): **76 passed of 76**, eight smoke tests as a desktop and as a phone and 60 as a Pixel 7, which
play something in every world. Among them are Memory Forest's new ones, played against the site: the same
four things laid out three ways and asked about the way they were left; five things, all new, and three to
keep; and the next sitting, after the page has been loaded again, beginning by asking for what was kept. No
probe was made beyond those tests. CI's own run on that commit has one red job, which is about a test's time
limit and not about the site: _Run 50_, above.

**After the owner merged pull request #14** (2026-11-26, `3f5c5f7`), two and three quarter hours after the
merge: Vercel's own record of the production deployment said "Ready", made three seconds after the merge. The
tests of that commit, not of this tree, were run against the address from a clean copy of it (the tests here
expect eleven lessons at Explorer Harbor, and eight are live): **78 passed of 78**, eight smoke tests as a
desktop and as a phone and 62 as a Pixel 7, which play something in every world. Among them are Inventor
Island's new ones, played against the site: a wall guessed to fall in a breeze that stands, and a prop on the
wrong side that holds nothing; and "My inventions", reached from the island, showing what is waiting to be
mended before anything has been. No probe was made beyond those tests. CI's own run on that commit was green
in every job: _Run 52_, above.

**After the owner merged pull request #15** (2026-11-26, `64a507b`), an hour and three quarters after the
merge: Vercel's own record of the production deployment said "Ready", made three seconds after the merge. The
tests of that commit, not of this tree, were run against the address from a clean copy of it, and this time
on every screen the configuration has, where the three checks before this one asked for three of them: **324
passed of 329, none failed, and five were passed over as they are written to be** (one test, which is for a
phone held upright, on the five other screens it was listed on). Eight are the smoke tests as a desktop and
eight as a phone; 60 each are the tests of layout as a tablet, as a phone held sideways and as a small phone;
and 64 each are the Pixel 7's, upright and sideways, which play something in every world. It took 21.7
minutes. Among them are the globe's, played against the site, two on each of five screens: every pin on the
globe where its land is, in sight and clear of the others, with the land that is found lit; and a famous
place shown with the shape of its land, and put on the globe where it is when its land is found. No probe was
made beyond those tests. CI's own run on that commit was green in every job, with two tests at a second
attempt, one of which is a fault that is live: _Run 54_, above.

**After the owner merged pull request #16** (2026-11-26 at 22:25, `cbadaa3`), about two hours and a half
after the merge: Vercel's own record of the production deployment said "Ready". The tests of that commit, not
of this tree, were run against the address from a clean copy of it, on every screen the configuration has:
**329 passed of 329, and none failed or was passed over** (the test that had been passed over five times in
the check before is listed now only where it is run). Eight are the smoke tests as a desktop and eight as a
phone; 61 each are the tests of layout as a tablet, as a phone held sideways and as a small phone; and 65 each
are the Pixel 7's, upright and sideways, which play something in every world. It took 22.2 minutes. Among them
is the room for making a story, played against the site on five screens: a story made by five taps on
pictures, each page told as it is made, and the globe's two, with the turn now mended. No probe was made beyond
those tests. CI's own run on that commit was green in every job, with no test at a second attempt: _Run 58_,
above.

## An update, rehearsed

`npm run rehearse:update -- <commit>` (`scripts/rehearse-update.mjs`): two real builds and one browser, in
Chromium as a phone. The build of the commit is served. On it an activity is finished, a second is left at its
third step, a tab is left in the middle of a third, and another on the map. Then the other build is served at the
same address, as a deployment puts one build in the place of another, and eighteen things are checked;
twenty-four since phase 12, which changed what an answer that is already stored means.

| From                                                         | To                                   | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `334e0e8`, the build before the six worlds: what a phone had | `0e836eb`, the build that went live  | **16 of 18.** The two that failed: a world's page opened by its address did not show what was finished, and Play went back to the first activity                                                                                                                                                                                                                                                                                                                           |
| `0e836eb`, what is live                                      | this tree                            | **18 of 18**                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `765be14`, what was live then (the Music Lab's activities)   | pull request #9 as first written     | **16 of 18.** The activity left at its third step was begun again at its first, and its stored place was gone                                                                                                                                                                                                                                                                                                                                                              |
| `765be14`, what was live then                                | pull request #9 with the fix         | **18 of 18**                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `765be14`, what was live then                                | this tree, with Reading Cove's six   | **18 of 18**, twice: before the last change to how a sentence is laid out, and after it                                                                                                                                                                                                                                                                                                                                                                                    |
| `dbbdbc3`, what was live then (pull request #9 merged)       | this tree, with Reading Cove's six   | **18 of 18**                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `8288833`, what was live then (pull request #10 merged)      | this tree, with the first-visit help | **18 of 18**: a player's settings may now hold three more things, and a player stored by the build before has none of them                                                                                                                                                                                                                                                                                                                                                 |
| `ed3efd6`, what was live then (pull request #11 merged)      | this tree, with Robot Ridge's three  | **18 of 18**                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `3c322c5`, what was live then (pull request #12 merged)      | this tree, with Memory Forest's two  | **18 of 18**: a sitting may now be told what the one before it kept, and a sitting stored by the build before kept nothing                                                                                                                                                                                                                                                                                                                                                 |
| `a0e60f8`, what was live then (pull request #13 merged)      | this tree, with the island's shelter | **18 of 18**: a player's settings may now hold what a grown-up says was tried, and a player stored by the build before has none of it; the island's content is a new version, and its four live activities keep theirs                                                                                                                                                                                                                                                     |
| `3f5c5f7`, what was live then (pull request #14 merged)      | this tree, with the harbour's globe  | **18 of 18**: the harbour's content is a new version, and its eight live lessons keep theirs; the continents' outlines are a new file of the build; nothing that is stored has changed shape                                                                                                                                                                                                                                                                               |
| `64a507b`, what is live now (pull request #15 merged)        | this tree, with the harbour's room   | **18 of 18**: no lesson has changed and nothing that is stored has changed shape; a player's settings may now hold the day a grown-up said a story was told back, in the place they already hold what was tried                                                                                                                                                                                                                                                            |
| `64a507b`, what is live now                                  | this tree, after CI's run 55         | **18 of 18**: nothing that is stored has changed, and no content; the grown-ups' part of the build has, and a tab left open on the old build that asks for it says so and offers to load the page again                                                                                                                                                                                                                                                                    |
| `64a507b`, what was live then                                | this tree, with phase 12             | **24 of 24.** What is stored goes from its first version to its second. On the live build, _Find the pairs_ was played to its end without remembering: four boards alone in 13, 14, 14 and 15 turns, each stored as right with no mark, and its grown-ups' page said "provisionally independent" of finding pairs. After the update the five games that took too many turns carry the mark, the other answers are what they were to the letter, and the page says "guided" |
| `cbadaa3`, what is live now (pull request #16 merged)        | this tree, with phase 12             | **24 of 24**, the same again from the build the merge made live: four boards of pairs found alone in 12, 12, 15 and 15 turns, stored by the live build with no mark and called "provisionally independent" on its grown-ups' page; after the update the five games that took too many turns carry the mark, the other 16 answers are what they were to the letter, and the page says "guided"                                                                              |

What held every time:

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

**The last row is the first update that changes what is already stored**, and the rehearsal was given six
more things to check for it. Before the update, on the build that is live, it plays _Find the pairs_ to its
end, turning the same two cards over seven times on every board done alone before finding anything, and
reads what that build stores and what its grown-ups' page says of it. After the update it checks that what
is stored says it has been brought up to date; that every game of pairs that took more turns than its board
allows now carries the mark; that nothing else of any answer has changed, comparing every answer stored
before with itself afterwards, to the letter; and that the grown-ups' page no longer says of finding pairs
what the turns did not show. So the fault is seen on the live build's own code, and seen mended by the
update, on data that build wrote.

**Its first run had one check fail, and that was the rehearsal's own fault.** "With every old tab closed,
the new service worker has taken over and cleared the old build out" reported both builds still kept after
thirty seconds. The script closed the last old tab and opened a new one in the same instant, and the old
service worker claimed the new tab: a worker stays for as long as it has a page. The longer rehearsal had
changed its timing by enough for that to happen. The script now gives the waiting worker its moment, asking
the workers themselves whether the old build has gone, before it opens another tab. Nobody closes a tab and
opens the next within a few thousandths of a second; a page that is loaded again is another matter, and has
always kept the old worker, which is what the "load the page again" path is tested for.

**The third row is the update pull request #9 would have been**, and it is the second time rehearsing one
has found something no other test could. Number Garden gained eleven activities, so its content has a new
version. The game took up an unfinished activity only if the whole world's content was the version it had been
begun in: so a child who had left "Which has fewer?" half-way would have been sent back to the start of it, for
the sake of activities that had nothing to do with it. A place is now kept by the lesson's own version, which
is what that version is for (`resumable`, in `src/game/lessonRunner.ts`), and what is answered after the update
is recorded against the content as it now is.

Looking for why also showed the opposite fault, which no rehearsal would have caught. "Make a tune" in the
Music Lab had been changed after it went live — three of its tunes from six bars to five — **and its version
had not been changed**: an activity left half-way there would have been taken up in a lesson that was no
longer the one it was begun in. It has its second version now. And it cannot happen silently again: every
lesson is written down by id and version with a mark made from the whole of it
(`src/content/lessons.lock.json`), and both the content build and a test refuse a lesson that differs from its
mark. The file was first written from the content that is live, and the build refused this tree at once, on
that lesson.

The first row is the update the six worlds were, done again with the same two builds: the service worker of its
second build is, byte for byte, the one the live site serves. It is still not the owner's phone. It is
Chromium, the one engine in which a service worker and the network can be driven together, and how Safari times
an update is not shown.

## Also not done

- No Firefox run.
- The whole suite has not been run against the live site, only what _The live site_ lists; and WebKit has never
  been pointed at it.
- The update rehearsal is run by hand before a release, in Chromium only. CI does not run it.
- The tests' new rule for WebKit's second report of a cancelled download (run 30, above) has run in WebKit
  twice, in runs 31 and 32, with no failure. Whether the case it is for arose in either is not known.
- Why WebKit, as CI drives it, now and then does not read a page the server has sent (run 31, above).
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

As a slower machine would run it (Chromium only), here with a processor an eighth as fast:

```bash
SLOW_CPU=8 npx playwright test e2e/globe.spec.ts --project=phone
```

The browser tests start their own server on port 4173 and will not reuse one that is already running there.
