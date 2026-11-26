# Test results

Everything in this file was actually run. Where something was not run, it says so.

- **Date:** 2026-11-25
- **Code under test:** `main` as the owner merged it on 2026-11-25 (pull request #10: Reading Cove's six
  later activities), with the pull request this document came with (#11): the help for a first visit. The
  release check below was run on that tree, in the parts it says. What was run on the live site was run on
  what was live, and says so.
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

| Step                   | Result                                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check` | clean                                                                                                                                                                              |
| `npm run lint`         | no errors, no warnings                                                                                                                                                             |
| `npm run typecheck`    | no errors (TypeScript strict, plus `noUncheckedIndexedAccess`)                                                                                                                     |
| `npm test`             | **1977 tests in 67 files, all passed**                                                                                                                                             |
| `npm run build`        | built; 659 files in `dist/`, 564 of them the voice's recordings                                                                                                                    |
| `npm run verify:dist`  | **1459 checks, all passed** (sizes below)                                                                                                                                          |
| `npm run test:e2e`     | **1212 browser tests in one go: 1025 passed, 186 skipped by design, 1 failed** (Chromium, seven screen shapes, 42.5 minutes). The one was a fault in the game, since fixed; see on |

**What the browser tests were run on, exactly.** The whole suite was run in one go on the tree with the
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
1225 tests: two more, of the guard that every test runs under, on the desktop and on the phone. The 1977
unit tests in the table are of this tree. Whether the page now fits an iPhone is for WebKit to say, in CI.

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
- **When a script's beats arrive** (`tests/game/useScript.test.tsx`, 5 tests): a script that opens with
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

| Run | What                                                          | Chromium, desktop and tablet    | Chromium, phones                 | WebKit, desktop and tablet                 | WebKit, phones                         |
| --- | ------------------------------------------------------------- | ------------------------------- | -------------------------------- | ------------------------------------------ | -------------------------------------- |
| 38  | pull request #9, Number Garden's numerals (`30d47ae`)         | cancelled by the next push      | cancelled                        | cancelled                                  | cancelled                              |
| 39  | pull request #9, the place kept through an update (`0afde1b`) | 17.9 and 8.6 for the two halves | 12.3 and 18.5 for the two halves | 15.3 minutes, after 12.8 installing WebKit | 22.1 minutes                           |
| 40  | `main` after the owner merged pull request #9 (`dbbdbc3`)     | passed, both halves             | passed, both halves              | passed                                     | passed                                 |
| 41  | pull request #10, Reading Cove's later activities (`563f46c`) | 17.1 and 10.8                   | 17.4 and 21.2                    | 22.6 minutes                               | 28.8 minutes                           |
| 42  | `main` after the owner merged pull request #10 (`8288833`)    | passed, both halves             | passed, both halves              | passed                                     | passed                                 |
| 43  | pull request #11, the help for a first visit (`4fce12e`)      | 25.4 and 12.6                   | 20.4 and 24.3                    | 21.8 minutes                               | **failed**, both halves: 13.3 and 16.8 |

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

**And the time, a third time.** The two halves of the desktop took 15.5 and 11.3 minutes, where the one job
had taken 29.2: that worked. But the phones took 32.5 of their 40: the phone is the screen everything pressed
is measured on, 54 tests then and more now. The phones are two halves as well.

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

## What the unit tests cover (Vitest, 1977)

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
| **Music** (Phase 11)                                              | `tests/engine/music.test.ts`, `tests/content/musicLabRules.test.ts`, `tests/game/musicLab.test.tsx`, `musicRoom.test.tsx`, `tests/app/audio.test.ts`    | Notes and their pitches; a tune's shape; keeping time, as sums; the Music Lab's 32 rules; what is played and in what order; the instruments' make-up and timing; the room to play in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **What the browser tests decide by** (after the six worlds)       | `tests/config/e2eDiagnosis.test.ts`                                                                                                                     | WebKit's words for a download it could not load are recognised, cut short or whole, and nothing else is taken for them; the preview server notes each page as it arrives and again when it has answered, and nothing else, and only when told where; and what a test that ran out of time is told about its page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Numbers** (Phase 06, second half)                               | `tests/engine/numbers.test.ts`, `tests/content/numberGardenRules.test.ts`, `tests/game/numberScripts.test.ts`, `numberPictures.test.tsx`                | What each of Number Garden's number pictures stands for, and which are refused; every rule for the later questions, with a case that breaks it; what is counted, named and lifted, in order, for a right answer and a wrong one; that a numeral shows no dots, a gap no tower and a bare stone no number until each is found; that nobody in a story overlaps anybody                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **When a script's beats arrive** (Phase 06, second half)          | `tests/game/useScript.test.tsx`                                                                                                                         | A script that opens with something shows it from the first frame; nothing moves for someone who has asked for less movement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **A dialog** (after the Music Lab)                                | `tests/ui/modal.test.tsx`                                                                                                                               | A late "closed" from before a dialog was opened again does not close it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **How to play** (Phase 04, the rest)                              | `tests/game/howto.test.ts`, `howtoView.test.tsx`                                                                                                        | What a move does, and that one which does not belong to the moment changes nothing; each showing as data (ends in the child's turn, says only recorded lines, no line on top of another, short with the sound or without); on a screen with the clock held, each line said when the one before is over even where the voice wakes late; leaving writes down that the player was shown and keeps their other settings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Help with the screen** (Phase 04, the rest)                     | `tests/game/nudge.test.tsx`                                                                                                                             | Where a tap landed; what is pointed out in each state, and never one answer; three in a row within a time; a press ends it and starts the count again; it goes by itself; the tick once; the line once for a step, and owed if Glim was talking                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Where to begin** (Phase 04, the rest)                           | `tests/game/placement.test.ts`, `tests/parent/whereToBegin.test.tsx`, `tests/game/progress.test.tsx`                                                    | What is suggested for what was seen, and nothing for what was not; what is unsaid is not written; Play begins where chosen and comes back to what was passed over at the end; the card keeps what is chosen, moves nothing until a suggestion is taken, and **writes no attempt and no sitting**; who counts as new to the game                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **A grown-up is helping** (Phase 04, the rest)                    | `tests/game/helping.test.ts`, `tests/game/lessonRunner.test.ts`, `tests/app/components.test.tsx`, `tests/ui/modal.test.tsx`                             | Off until said; kept for the visit and not beyond; every answer while it is on written down as helped and none counted as the child's own; asked at each answer; the switch is held to change, either way                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

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
| `desktop` (Chromium)                                                      | 1366×768                   | all 482 (the measurements of what is pressed, and eight tests for a small touch screen, skip themselves here) |
| `phone` (Chromium, touch)                                                 | 390×844                    | all 482 (keyboard journeys, and the activities played to their ends, skip themselves here)                    |
| `phone-landscape`, `tablet`, `small-phone` (Chromium, touch)              | 844×390, 768×1024, 360×740 | the 48 layout tests each                                                                                      |
| `android`, `android-landscape` (Chromium as a Pixel 7)                    | 412×839, 863×360           | the 48 layout tests and the 4 journeys each                                                                   |
| `webkit-desktop`, `webkit-phone` (WebKit)                                 | 1366×768, 390×844          | all 482 each, in CI only (what needs the 3D scene or the service worker skips itself)                         |
| `iphone`, `iphone-landscape`, `ipad` (WebKit as an iPhone 13 and an iPad) | 390×664, 750×342, 810×1080 | the 48 layout tests and the 4 journeys each, in CI only                                                       |

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
| `grownups.spec.ts`                           | The press-and-hold gate (pointer and keyboard); add, switch, change and remove players; separate records; save a copy, erase, load it back; a damaged or foreign file is refused; settings; diagnostics; fits the screen with the longest names. **A dialog that is cancelled and asked for again at once is there**: pressed in the moment between the dialog closing and the browser saying so                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `resilience.spec.ts`                         | **Lost storage:** wiped between visits, and wiped while the page is open; IndexedDB refused (progress kept in localStorage and survives a reload); all storage refused (still playable, and the grown-up is told); a part that cannot be downloaded shows a calm message and recovers on reload                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `offline.spec.ts`                            | With the real service worker: what was opened once opens again with no network and progress is kept; a part never opened says so; installing downloads the first screen only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `a11y.spec.ts`                               | axe-core, WCAG 2.1 A and AA rule sets, on the front door (first visit and returning), the hub, world pages, five states of the activity, the pause sheet, the end of an activity, the grown-ups gate, area and a dialog, and the not-found page: no violations. Each check waits for the page to finish arriving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `smoke.spec.ts`                              | Security headers, deep links, cache rules, the installable-app files, and a clean start. Tagged `@smoke`: these are the tests to run against a real deployment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `everything.spec.ts` (the six worlds)        | **Every activity of four worlds played from its first screen to its last**, by the answers its content says are right, with motion reduced so that only what the game insists on is waited for; and a test that fails if any activity of any world is played to the end by no test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `a11y-worlds.spec.ts`                        | axe-core, WCAG 2.1 A and AA, on every world's page (and again held sideways) and on every activity of those four worlds, while it is shown and while it is asked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `garden.spec.ts`                             | Number Garden's boards: a group taken in at a glance is covered before the choices are turned over, and another look is help; giving one at a time, taking back, and saying when it is done; more, fewer and equal each ask one thing **Asking to be told again in one step takes nothing from the next, and asked before a look is over it starts the step again with the look still to come** (with the clock held); a world's page opened by its own address, and loaded again, knows what has been finished; the button to take one back is the same button all through a count                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `numbers.spec.ts` (Number Garden's numerals) | A staircase's gap has nothing in it until the right tower is stood there, and towers to choose from stand side by side on every screen; a frame is filled only by the group that fills it, and an empty one answered with 0 stays empty; **a numeral shows its dots only while it is counted** (clock held: on the wrong numeral, then on the right one, and at no other time); a number that is said takes no answer until it has been said, and with the sound off says it needs sound; a bare stone has no number until it is found; **a story is shown from its first moment as it stood before anyone moved**, and to someone who has asked for less movement stands as it ends; those who went are faded and are not counted; and each kind of question says in words what it shows and never its answer                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `reading.spec.ts`                            | Reading Cove: with sound off an activity shows a gate and starts when it is opened; a sound can be heard again; a wrong picture is answered with its own sound; a printed word is read before its pictures are offered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `words.spec.ts` (Reading Cove's later ones)  | **What a child is helped with and what is left to them**: a word to rhyme with is said beside each choice with support; a word is clapped for a child one clap at a time and none is left standing, and alone nothing is clapped; each place for a letter lights as its sound is said, and alone none does; the picture of the word stands above the places, and a letter that was right in a wrong try stays; two letters that write one sound stand on one tile; a finger goes from word to word under a sentence that is read to a child, and alone the sentence is not read and no finger shows; **what the voice said is listened to, not inferred from what was fetched**; on a phone held upright a sentence is on two lines with its pictures side by side                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `memory.spec.ts`                             | Memory Forest: **nothing that is covered can be read off the page**; the cards to answer with are blank while things are on show; two that differ turn back; an order is shown again only as help; the question about the very start comes last **An order being shown takes no tap until all of it has been shown**: a tap is made in every pause, with the clock held, and none counts; asking again in the middle of an order gives it whole, and takes nothing from the next                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `harbor.spec.ts`                             | Explorer Harbor: a story is put in order and **told back picture by picture, each lifted while its own line is written under it**; a missing picture is nowhere in the page until it is found; **every place on a map is drawn where the content says, with land under it or not as the answer says**; places are 56 points or more and apart, down to 640×256; the boat sails to the island chosen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `robot.spec.ts`                              | Robot Ridge: each of four activities played rightly and wrongly by reading the ground from the screen and solving it; a run pauses and goes on; help; the keyboard; with less motion the way is marked instead of walked; axe on every board; the largest boards on 360×740 and 640×256                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `inventor.spec.ts`                           | Inventor Island: a guess is tested there and then, and one that did not come true is kept beside what happened; a mend tests a change only when something has changed; help; every activity played to the end; standing still where nothing should move; sideways with a notch; axe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `voice.spec.ts`                              | The lines of an activity are fetched from the game's own files when wanted, and said; nothing is fetched with the sound off; a recording that cannot be fetched is done without; the voice stops on pause; every recording is listed for a grown-up, plays, and keeps its mark                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `howto.spec.ts` (the first-visit help)       | **A new player is shown how to play, once.** From the front door; each of the three things done; everything pressed measured on every screen shape; Glim's lines listened to in order. With the clock held, each showing watched one moment after another, nothing answering a tap before it is shown, and the hand coming to what there is to tap. Passed by with the house; shown again after a visit that ended in the middle of it; not shown to a child who was already playing; done with the sound off, and from the keyboard                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `help.spec.ts` (the first-visit help)        | **Taps that land on nothing** bring the ring to every answer alike (or to the one way on) and the words to Glim's bubble; the line is said once; the activity then played to its end records three independent successes. With the clock held: not across a pause in the tapping, gone in a few seconds, "watch first" while choices are turned away, a tick pointed out once. **A grown-up is helping**: held to change, never tapped; answers then recorded as helped; before and after are the child's own; kept for the visit only; can be set on "how to play"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `begin.spec.ts` (the first-visit help)       | **Where to begin**: a suggestion moves nothing until it is taken; Play is then the chosen activity; every activity is still there, none marked done, the first still opens; nothing is written into what the child has shown; kept at the next visit; one player's, not the device's                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## Sizes (`npm run verify:dist`)

| What                                                    | Size (gzip) | Budget  |
| ------------------------------------------------------- | ----------- | ------- |
| Script for the first screen                             | 105.8 kB    | 110 kB  |
| Styles for the first screen                             | 7.4 kB      | 12 kB   |
| Fonts                                                   | 67.2 kB     | 80 kB   |
| The hub's pictures (WebP, not gzipped)                  | 284.0 kB    | 330 kB  |
| 3D hub (on demand)                                      | 260.1 kB    | 290 kB  |
| Largest other on-demand part (Number Garden's content)  | 12.4 kB     | 30 kB   |
| The game: everything but the voice and the content, raw | 2532.4 kB   | 2700 kB |
| The content: seven packs, raw                           | 573.9 kB    | 900 kB  |
| The voice: 564 recordings (MP3, not gzipped)            | 6246 kB     | 9000 kB |
| The largest recording                                   | 32.8 kB     | 60 kB   |

A world's code is 2.5 to 12.2 kB and its content 3.5 to 12.4 kB, each fetched on entering that world (Reading
Cove's are 11.0 and 11.2); the lesson frame is 8.5 kB and the part of the engine that judges answers 5.6 kB,
fetched with the first activity; and a recording is fetched when the step that may say it arrives.

**Two of these are worth watching.** The script for the first screen is 105.8 kB of the 110 it is allowed, and
it has grown with every activity: what each world offers, with the grown-ups' words about it, is in it. (Six
more activities in Reading Cove added a tenth of a kilobyte; the first-visit help added seven tenths, for
what a player's settings may now hold and for the front door's knowing who is new. "How to play" itself is a
part of its own, 3.9 kB, fetched only by someone who is shown it.) A larger batch of activities will need those
words moved out of the first load. And the budget for the whole build
is now two budgets, because one had stopped meaning anything: it had been raised twice to let content in, and
Number Garden's numerals went over it again (2942 kB of 2900). Content is meant to grow and has a limit of its
own; what is left is the game itself, and its limit is tighter than the old one.

The verifier also proves, on the built files: one entry script; no 3D code, studio, character sheet, world or
recording reachable from it by static import; no inline script or style (so the CSP holds); no development URL in any file; the manifest and
its icons; and that the service worker pre-downloads exactly the first screen's files and knows every hashed file.

## Screenshots

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

That is evidence that Vercel serves what was built, with the headers and routing the tests expect, and that the
voice's files arrive. It is not a phone, and nobody has heard those recordings play. Nor is it evidence that
what was built was right: the five faults in _What was found after the six worlds went live_ were on the site
while every one of these checks passed.

## An update, rehearsed

`npm run rehearse:update -- <commit>` (`scripts/rehearse-update.mjs`): two real builds and one browser, in
Chromium as a phone. The build of the commit is served. On it an activity is finished, a second is left at its
third step, a tab is left in the middle of a third, and another on the map. Then the other build is served at the
same address, as a deployment puts one build in the place of another, and eighteen things are checked.

| From                                                         | To                                   | Result                                                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `334e0e8`, the build before the six worlds: what a phone had | `0e836eb`, the build that went live  | **16 of 18.** The two that failed: a world's page opened by its address did not show what was finished, and Play went back to the first activity |
| `0e836eb`, what is live                                      | this tree                            | **18 of 18**                                                                                                                                     |
| `765be14`, what was live then (the Music Lab's activities)   | pull request #9 as first written     | **16 of 18.** The activity left at its third step was begun again at its first, and its stored place was gone                                    |
| `765be14`, what was live then                                | pull request #9 with the fix         | **18 of 18**                                                                                                                                     |
| `765be14`, what was live then                                | this tree, with Reading Cove's six   | **18 of 18**, twice: before the last change to how a sentence is laid out, and after it                                                          |
| `dbbdbc3`, what was live then (pull request #9 merged)       | this tree, with Reading Cove's six   | **18 of 18**                                                                                                                                     |
| `8288833`, what is live now (pull request #10 merged)        | this tree, with the first-visit help | **18 of 18**: a player's settings may now hold three more things, and a player stored by the build before has none of them                       |

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

**The third row is the update this pull request would have been**, and it is the second time rehearsing one
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

The browser tests start their own server on port 4173 and will not reuse one that is already running there.
