# Continue here

**Seven worlds are built: the six islands, and the Music Lab in the lighthouse. Phases 01 to 03 are complete;
phase 04 is built (the voice, and help for a child's first visit); phases 05, 06 and 11 are built as far as
their briefs' last optional parts, and phases 07, 08 and 09, Robot Ridge, Memory Forest and Inventor Island,
as far as their briefs go; phase 10 is partly done. All of it is unheard. The rest of the plan is being built
on one branch, a pull request at a time: the owner has merged each one soon after its checks went green, six
times now, so every push is kept fit to go live. The one that is open is
[#14](https://github.com/JaredVogler2/Training_Academy/pull/14).**

- **Date:** 2026-11-26
- **What is live:** `main`, at `https://training-academy-dun.vercel.app`: the six islands and the Music Lab,
  67 activities, the help for a first visit, Robot Ridge's seven activities, and since 2026-11-26 Memory
  Forest's two later ones (remember it your way, keep it for next time), with a world's page that keeps
  still as it arrives and things to remember set out larger on phones. The owner merged pull request #13 that
  day, 36 minutes after the last of its checks went green. The update had been rehearsed (18 of 18). The live
  site was checked 21 minutes afterwards: Vercel's production deployment of `a0e60f8` was ready, and 76 of 76
  browser tests passed against the address as a desktop, a phone and a Pixel 7, with Memory Forest's new
  activities played through among them, one across a page loaded again.
- **CI on `main` is red, in one job of thirteen, and the site is not why.** Two tests of Robot Ridge's longest
  activity ran out of their sixty seconds in Safari's engine. In the run before, of the same files, they had
  passed in 59.5 and 59.4. Nothing in the game is slow: the tests play a whole sitting at a child's pace. The
  remedy is on pull request #14 (a test has two minutes, and one that uses three quarters of its limit fails
  for that), so `main` keeps its red mark until that is merged. The job was not run again: a pass by half a
  second would show nothing.
- **One small fault is live, in Safari, and has been since the first-visit help went live.** Now and then a
  tap on a picture in the moment the sound first comes on is seen by nothing, so that the help which comes
  after three taps on nothing comes after four. No answer is known to have been lost to it. CI met it twice;
  the second time the test could say what the page had been given, and that found it. Its fix is on pull
  request #14.
- **What is not live**, on pull request #14: **Inventor Island's fifth activity, a shelter from the wind**;
  a switch under each thing to try away from the screen, which a grown-up holds to say it was tried; **"My
  inventions"**, a page of the last thing a child mended at each workbench; and the two fixes above.
  The update from what is live to this tree was rehearsed: 18 of 18. When it goes live, Inventor Island has
  five activities where it had four, the new one last, and a way to its room under them.
- **The owner's instruction for this stretch of work** (2026-11-25): build all that is left, in the order
  recommended, and the owner will review all of it at once, sounds included, when it is complete. The order:
  the Music Lab; numerals and the number line in Number Garden; rhyme, syllables, letter pairs and sentences in
  Reading Cove; the first-visit help that phase 04 asks for; the gaps in the other four worlds; then phases 12
  to 17. `docs/PROGRESS.md` says how far that has got.

## The one thing that matters most now

**Nobody has listened to anything, and nobody has played.** The game talks — 604 recordings, made by a speech
synthesiser ahead of time and shipped with it, each checked by a speech recogniser, which is a machine's
opinion of the words and nothing more — and it also plays notes, which are made by arithmetic at the moment
they sound and which no ear has checked at all. The briefs call the accuracy of the audio a release gate. That
gate has not been passed, and it matters more with each world: three of the Music Lab's activities are nothing
but listening, and in Reading Cove a word is now cut into its beats, and a place lights and a finger moves in
time with what is said, at moments the synthesiser gives for its own speech and nobody has checked by ear.

What to do about the voice is already in the game: **Grown-ups → _The voice: listen to every recording_** plays
each clip beside what it should say and lets it be marked as sounding right or wrong. For the notes there is no
such list: open the Music Lab, tap _Just play_, and play the bars from left to right. They should climb a scale,
each sounding like a small struck bar; the drum should be a soft low knock; the birds in _High and low_ should
sound like a whistle. If they do not, say what they sound like: every one of them is a few numbers in
`src/audio/audioEngine.ts`.

And for what is shown in time with the voice, play three things in Reading Cove with the sound on and watch:
_Clap the word_ (does each clap come on a beat of the word, and is the word cut where a person would cut it?),
_Build the word_ (does each place light as its sound begins?) and _Read the sentence_ (is the finger under the
word that is being read?). In each the first step is shown by Glim, so there is nothing to answer first.

The same is true of the pictures and the activities themselves. Each was looked at on a desk at several sizes,
and no child has seen one.

## The state, in one paragraph

A static React and TypeScript app builds to `dist/` and runs under the same headers and routing that `vercel.json`
gives it. A visit opens on a front door, and someone who has never played is shown how before anything else;
behind it is the map, six islands round a lighthouse, and all seven places are open. A place's page offers the next thing to play as one large button and every activity as a
picture. There are **68 activities and 788 challenges**: sounds, rhyme, the beats of a word, first sounds,
letters, blending, building a word, pairs of letters and a sentence in Reading Cove; amounts, counting and
comparing, then numerals, the numbers in order and adding and taking away in Number Garden; a robot to steer,
a row of steps to mend, a long way to plan and a bridge to wait for in Robot Ridge; pairs, hidden things,
orders, three ways to remember, a choice among them and three things kept for the next visit in Memory
Forest; guesses that are tested and things to mend in Inventor Island, a shelter from the wind among them,
with a page of what a child has mended; stories to put in order, why things happen and a map to answer on in Explorer Harbor; and in
the Music Lab high and low, the same or different, a beat to tap, notes to play back, a tune to know again and a
tune to make, with a room to play in freely. Each activity is shown first by Glim, then tried with help at hand,
then tried alone, and what a child did alone and at the first try is kept apart from everything else. Every
challenge is written out in a file, made from tables by a generator and refused by its world's rules unless its
answer is right. Everything is saved on the device.

## Verified

- Locally: format, lint, typecheck, **2263 unit tests**, the production build and its **1553 build checks**.
  The whole suite was run in one go in Chromium on all seven screens, on the final tree: **1402 tests, 1181
  passed, 221 skipped by design, none failed** (52.7 minutes). WebKit is CI's.
- **CI's last two runs, 49 and 50.** Run 49, on pull request #13, was green in all thirteen jobs with one
  test passing at a second attempt: the three taps that brought no nudge, a second time, and now explained
  and put right (above). Run 50, on `main` after the merge, has the one red job (above). The page that never
  comes in CI's WebKit, seven times so far and still not explained, came in neither. `docs/TEST_RESULTS.md` →
  _Run 49_ and _Run 50_.
- **CI's twelve browser jobs do what they were made for.** In the two runs since they were dealt out by
  screen, the longest set of tests took 15.8 minutes and the longest job 17.1, of forty; a slow mirror cost
  two jobs four and five minutes and nothing came of it.
- **A test's time limit means something now.** Two minutes unless a test asks for more, and a test that
  passes having used three quarters of its limit fails for that, with the remedy in its words. Read from run
  49's reports, 74 tests had been using more than half of the one minute they had, and two of them all but
  half a second of it.
- **The tests that passed first time were made to fail.** For Inventor Island's shelter, its record and its
  portfolio, and for what CI's two runs led to, seventy faults were put back one at a time: sixty-seven were
  caught at once by the test meant for them; one was caught by nothing, and the model was wrong to allow it;
  one was caught only by the linter; and one did not build, so nothing ran. For Memory Forest's two later
  activities and what
  came with them, eighty-eight faults were put back one at a time; eighty-six were caught by the test meant
  for them, one was a check that could never matter (removed), and one is a rule no test holds (room for a
  second line under "Play"; `docs/QUALITY_REPORT.md` says so). For Robot Ridge's three later activities,
  sixty-one, of which the two not caught were checks that can never fire, since removed. For the way out of
  "how to play", five; for the guard's rule, thirteen. For the first-visit help, eighty-six (fifty-three
  against the unit tests, thirty-three in a browser): seventy-nine were caught at once, and the other seven
  were each a fault in a test, put right until it failed. `docs/TEST_RESULTS.md` says what was wrong with
  each, and it is worth reading before writing another test that says "there is none". It also lists the
  faults for Reading Cove, the Music Lab and Number Garden.
- **Every activity is played to its end by a browser test**, with the answers its content says are right
  (`e2e/everything.spec.ts`; Robot Ridge and Inventor Island in their own specs). The beat is tapped the way a
  person taps it: from the first beats heard, each tap begun a little ahead.
- Every content pack is exactly what its generator writes, and every rule that can refuse a challenge has been
  shown to fire (`tests/content/`): 32 of them are the Music Lab's.
- Every browser test also fails on any console error or warning, failed request, or request to another origin.
- **The live site**, as above: `main` after pull request #13. `docs/DEPLOYMENT.md` has the check.
- **The update from what is live to this tree was rehearsed** (`npm run rehearse:update -- origin/main`), in
  Chromium: 18 of 18, from the build that pull request #13's merge made live. Rehearse it again after any
  later change to content or to what is stored.

## Not verified — read this before relying on anything

- **Sound, of any kind.** No person has listened to a recording or a note (above). That the notes are in tune
  with their names is arithmetic and is tested; that they are pleasant, or even plainly notes on a phone's
  speaker, is not known. The drum is tuned to 150 hertz with a knock above it because a phone gives almost
  nothing below middle C; whether that was enough is for a phone to say.
- **Keeping the beat, by a child.** The allowance was chosen from what is written about young children's
  tapping and from arithmetic. Whether a four-year-old who is keeping the beat passes, and one who is not does
  not, is not known.
- **Whether what is shown comes when it is said.** In Reading Cove a clap, a lit place and a finger follow
  moments written down with each recording. They are the synthesiser's account of its own speech. Where a word
  is cut into its beats has been checked by nothing: the recogniser hears the word before it is cut.
- **Whether a synthesised voice's vowels are clear enough to rhyme by.** The recogniser took its "hut" for
  "hot" and its "tin" for "ten" when each was cut out alone.
- **The numerals' shapes, and whether a wrong answer counted out is a help.** The numerals are drawn here, in
  one school's hand (an open 4, a 7 with no bar, a 9 with a straight stick); a child taught another will meet
  two. And every wrong answer in the new Number Garden activities is answered by counting it, which takes
  time, and which no child has sat through.
- **Whether a child follows "how to play".** It is three things shown once each by a hand and a voice, to
  someone who may never have held a phone. Whether a three-year-old then taps the one that is the same, or
  taps the hand, or waits, is not known; nor is whether thirty seconds of it is too long before the first
  island.
- **Whether choosing how to look means anything to a child.** In Memory Forest a child now picks one of
  three ways to look at four things. What is written down is which way the things were in when they were put
  away. Nothing shows that the way was used to remember by, and nobody has watched a child choose.
- **Whether a child takes from the shelter what it is about.** That a thing is held from the side it would
  fall to is shown by a prop that held nothing coming down. Nobody has watched a child watch it. And the
  model is a toy: in one thing, the opposite of a tent's rope and peg (`docs/CURRICULUM.md`).
- **Whether anything was tried away from the screen.** The switch is a grown-up's word, and a child who
  holds a button for a second can say it too. It is shown as a word and counted nowhere.
- **Whether what is kept is ever asked for.** Three things are asked for again only at the next sitting of
  that one activity, ten minutes or more later. Ten minutes is a guess, and a family that plays it once has
  no later.
- **Whether help with the screen helps.** Three taps on nothing in eight seconds is a guess at what "does not
  know what to press" looks like. A child who taps a picture because it is a picture is told what to press
  too. Nobody has watched either.
- **No child, no teacher, no speech or music specialist** has seen any of it.
- **No real device, by this project's own testing.** The owner has opened the live site on an iPhone. The named
  devices in the tests are the right screen, pixel ratio, touch and user agent on desktop engines. How late a
  real phone's sound is, and how late its touch, are what the beat's allowance is for and have not been
  measured on one.
- **The live site, beyond what is listed above.** Safari's engine has never been pointed at it.
- **WebKit, here.** Safari's engine runs only in CI.
- **No real graphics hardware.** The 3D hub has only ever been drawn by a software renderer.
- No Firefox. No screenshot-comparison tests.

## What the owner can do now

Nothing is waiting on the owner: the instruction was to build on and review at the end. When that review comes,
or sooner if there is a moment:

1. **Play the bars in _Just play_ and say what they sound like** (above). It is the cheapest thing to find out
   and the Music Lab stands or falls by it.
2. **Listen to the voice**, on the phone the game is for. Mark what sounds wrong.
3. **Play one activity in each world with a child**, and say what happened. In the Music Lab, _Tapping with the
   beat_ is the one to watch: does a child who is plainly in time get "Yes. You kept the beat."? In Number
   Garden, _Numbers one to five_: give a wrong answer on purpose and watch whether the counting that follows is
   watched.
4. **Look at the numerals** (any of Number Garden's activities from _Numbers one to five_ on) and say whether
   they are the shapes your child is being taught. They are one small file.
5. **Watch the three things in Reading Cove that move in time with the voice** (above), and read a sentence on
   the smallest phone to hand: is the print large enough?
6. **Decide the guide's name.** "Glim" is provisional and unchecked; it is one string in `src/app/strings.ts`.

7. **Meet the game as a new player.** Open it in a private window, choose a picture, and do what Glim shows
   (or hand it to a child and watch). Then, in any activity, tap the picture three times instead of an answer.
   Then pause, hold the grown-up's mark, and look at **Grown-ups → Where _name_ begins**.

8. **Play Robot Ridge's last three activities**, which are live. In _A longer way_, put a step in and press the small arrow beside the row: does the robot
   showing each step make a long way findable? In _Wait for the bridge_: do three dots read as "wait", and
   is the bridge seen to be up?

9. **Play Memory Forest's last two activities**, which are live. In _Remember it your way_: do the three
   pictures under the things read as ways of looking at them? Then play _Keep it for next time_ to its end,
   come back a quarter of an hour later, and see what it asks first.

10. **Play _A shelter from the wind_** (on the preview of pull request #14, or on the site once it is
    merged). Does a child see why the wall fell, and where the prop has to go? Then, on Inventor Island's
    page, hold the tick under a thing to try, and open **My inventions**.

Pull request #14 has a preview on Vercel (behind the owner's Vercel login) for looking at the shelter and
the portfolio before they are merged.

## The next action

If this session is the one still building: carry on down the order above. The Music Lab, Number Garden's
numerals, Reading Cove's later activities, the first-visit help of phase 04, Robot Ridge's longer plans and
bridge, Memory Forest's choice of a way and its keeping for next time, and Inventor Island's shelter, record
and portfolio are done; **next is the gaps in the last world** (making up a story, stories that branch, and a
globe in Explorer Harbor), and then phases 12 to 17. `docs/PROGRESS.md` → the table at the top says which phases are done; its _Known
gaps_ table says what each world still lacks.

If it is a new session:

> Read prompt-series/README.md and prompt-series/00_MASTER_BRIEF.md, then docs/CONTINUE_HERE.md,
> docs/PROGRESS.md, docs/CURRICULUM.md and docs/ARCHITECTURE.md. Pull request #14 is open: carry on with what
> docs/CONTINUE_HERE.md says is next, on the same branch. It must work on Android and iOS devices on a Vercel
> deployment.

First steps, in order:

1. `npm ci`, then `npm run verify:release`, to confirm the starting point is green.
2. If anything has been learned from a real phone, a child or a listener since this was written, fix that first.
   A recording that sounds wrong is put right by changing its words in the world's generator
   (`scripts/content/`) or `src/voice/lines.json` and making it again (`scripts/voice/README.md`). A note that
   sounds wrong is put right in `strokeOf` in `src/audio/audioEngine.ts`.
3. Read `docs/ARCHITECTURE.md` → _The learning engine_, _The lesson frame_ and _The voice_.
4. Read `docs/QUALITY_REPORT.md` → the newest section → _What is still wrong or weak_.

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

**New in Phase 11**

- **A new world is a list of places to touch**, and the type checker finds most of them once its id is in
  `WORLD_IDS`: the pack and its generator, its rules and a case that breaks each, its module, its emblem and
  colours, its entry in `src/game/worlds.ts`, its voice lines, the play-through helper (`e2e/play.ts`), and
  `WORLD_NAMES` in `e2e/fixtures.ts`. A world is not a place on the map: `placeOf` (`src/render/extents.ts`)
  says where it is, and the Music Lab's place is the lighthouse.
- **Before adding anything to the map, measure every screen.** A scratch test that prints, for each screen
  shape, the size of an island and everything that overlaps is quicker than reasoning about five arrangements,
  and found that a name level with two others leaves none of the three room to be wider than its island.
- **A script can say that what it plays is the question** (`Writer.essential()`). It then plays even where
  motion is reduced, and a question with choices takes no answer until the last of it has sounded.
- **Sounds that must fall on a beat go on the audio's own clock** (`playTone(…, { at })`, `audio().clock`),
  a beat ahead, and what is seen follows the same arithmetic. A sound started from a timer is late by whatever
  the page was busy with.
- **An instrument answers a press, not a click** (`usePressNow`): a click comes when the finger lifts.
- **A tap is timed by the page's clock, not by the event's stamp.** Under a test's held clock the two are
  different clocks, and a test that mixed them would pass or fail by the time of day.
- **A test tool will not press a thing that is waiting.** To show that a tap on something `aria-disabled` does
  nothing, tap the screen where it is (`page.mouse.click(x, y)`), and then break the code to see the test
  fail: a forced click proves nothing.
- **A test of where things are must be on the screen where it could go wrong.** Four bars stand in a row on a
  desktop whatever is done with them; the test of the row is the one on a phone.

**New with Number Garden's numerals**

- **A new kind of picture needs no change to the engine.** A `scene` stimulus carries anything a world can
  draw. What it _means_ is read in one place (`src/engine/numbers.ts` for Number Garden's), and the rules, the
  scripts and the drawing all ask there. Write that reader first, and its tests; the rest follows from it.
- **An answer worked out twice is an answer checked.** The generator works each answer out from its table row;
  the rules work it out again from the finished picture, by other code. They have to agree for a pack to be
  built.
- **A picture is cut to what is in it.** A drawing sized for the most it can ever hold shows two frogs at a
  third of the size the screen allows. Give the picture a box that fits its contents (`storyPlaces` returns
  one) and let the screen scale it.
- **A wide picture needs the width** when a phone is held sideways: `data-asks-about` on the board, and a rule
  in `Lesson.module.css`. Look at every new kind of question at 844×390 and 640×256 before calling it done.
- **A script may open with something** (a beat at its very first moment), and the board shows it from the first
  frame. Anything that must not be seen "already over" opens that way.
- **A test that waits for a state can pass on the way to it, or after it.** Two of the new browser tests passed
  with their fault put back: one looked before the board had settled, one waited for an ending that the fault
  also reached. Put every fault back (`scratch` tools do it: break one line, run one test, restore) and read
  the result, each time.
- **Rehearse the update before every push that changes content**, not only before a release: the owner
  has merged three pull requests without warning, one within seconds of its checks going green. And
  **look whether the pull request is still open before pushing to it**: a push to a branch whose pull request
  has been merged goes nowhere a reviewer will see. `npm run rehearse:update -- origin/main` found that adding
  activities to a world sent a child back to the start of an unfinished one. A place is now kept by the
  lesson's own version, and a lesson cannot change without one: `npm run content` refuses it
  (`src/content/lessons.lock.json`). To change a lesson that is live, give it a new version in its generator.
- **The game's size and the content's size are budgeted apart** (`scripts/verify-dist.mjs`). Content is meant
  to grow; the game's own code is not meant to jump.
- **The first screen's script is 106 kB of the 110 it is allowed**, and what each world offers
  (`src/game/worlds.ts`) is in it, grown-ups' text and all. More activities will need that text moved out of
  the first load.
- **Testing a deployment, name the screens**: `BASE_URL=… npx playwright test --project=desktop
--project=phone`. Without them the layout tests of five more screens run against the site as well.

**New with Memory Forest's later activities**

- **A question can be followed by another, and a sitting can keep something for the next** (`plan.then`,
  `plan.keep`). The engine still reads no clock and no store: it is told what the sitting before kept, when,
  and what day it is (`kept` and `day` to `createSession`; `lastKept` in `src/game/lessonRunner.ts` looks it
  up). Anything else that has to reach across sittings should come in the same way.
- **An answer can carry how it was reached.** A recall is written `story-drum`: the way, then the card. The
  record's shape did not change, and the way can be read later.
- **A world's page is whole before its content arrives.** What each activity is called comes from
  `src/content/lessonList.json`, written by the content build; room is kept for every picture. Anything new
  on that page needs its room kept too: `e2e/shell.spec.ts` holds the content back and measures everything
  before and after.
- **Measure the pictures; do not only look at them.** The review pictures of five things on a phone held
  sideways were looked at and passed. A script that printed the size of each thing on eleven screens said 33
  pixels. Make that script for every new board, and include 844 by 390 and 750 by 342, not only the extremes.
- **A rule for one shape of screen goes after the rule it changes, in the same file.** One that came first
  did nothing, and its test passed for another reason.
- **A tool of the tests' own that allows a margin of real time will one day lose it.** `holdClock` read the
  page's time and asked the clock to stop 20 ms later; once in CI that was too late. It asks again now. Try a
  tool's failure outside a test first, to see what the library does: Playwright's clock, refused, is left
  held.
- **A test that changes a setting waits for "Saved." before it leaves the page.** One did not, the second
  time it changed something, and lost the change on a busy machine.
- **A world's page says when it knows who is playing** (`data-settled`), and until then its Play goes to the
  beginning for everyone. A test that expects Play at the beginning waits for it first (`worldSettled` in
  `e2e/fixtures.ts`), or it has tested nothing: one passed for as long as it existed with its change never
  saved. To find such a test, break what it is about on purpose (here, a save slowed by 0.4 s).
- **CI's jobs are named by screen.** Playwright deals tests out by number, one screen after another, so three
  equal parts of five phones were 11, 15 and 26 minutes. When a screen's tests outgrow a job, give that
  screen another job; do not add a part.
- **Before committing part of a tree, look at what is already staged.** A deleted file staged long before
  nearly went in with a commit about something else.
- **The game's own code has 114 kB of its budget left** (2586 of 2700 kB). Two worlds still have boards to
  gain. Raising the budget is a decision, to be said in the commit that does it.

**New with the first-visit help**

- **"There is none" must not be waited for.** `expect(x).not.toHaveAttribute(…)` waits until it is true, and a
  thing that goes away by itself (a nudge, a hand, a toast) will oblige. A test of that kind passed with one
  tap made enough to bring a nudge. Ask once, at once (`nudgeNow` in `e2e/help.spec.ts`), or hold the clock.
- **What is behind the front door is in the page.** The map and its seven links are there all along, switched
  off. "Seven islands and no how-to-play" is true of the front door too, so it says nothing until the door has
  gone and the address has been read (`atTheIslands` in `e2e/howto.spec.ts`).
- **One place decides what a tap does.** "How to play" had a second check in its boards ("only ask if the
  answer will be yes"), and a fault in the rules could not then be seen by any test that taps a screen. The
  boards now ask whatever the moment, and `move` (`src/game/howto/steps.ts`) says.
- **A test that loops until something happens must be able to give up.** A helper that played "how to play"
  forward with `for (;;)` hung the whole run when a fault stopped it getting anywhere. It walks the three
  steps once now, and says where it stopped.
- **How long a line takes is known only once the voice is awake**, and the tap that opens a page may be the
  tap that wakes it. Ask `voice().seconds` when the time is needed, not when the page opens. (In an activity
  the voice has long been awake; on the page a new player lands on straight from the front door, it has not.)
- **A thing a grown-up sets, on a screen a child taps, is held to change** (`HoldToggle`), both ways: a small
  finger must not be able to switch help on, and must not be able to switch it off.
- **A new page that is made like an activity** needs four things an activity gets for nothing: no top bar
  (`App.tsx`), the whole screen (`App.module.css`), the notch test (`e2e/phones.spec.ts`), and its own
  accessibility check.
- **A player's settings may grow** (`ProfileSchema.settings`): new keys are optional, absent means "nothing
  said", and saving the settings saves the whole of them, so spread what is there (`withObserved`,
  `withStart`). Rehearse the update after adding one.
- **What a grown-up says is never evidence.** `observed` and `startAt` live in a player's settings and are read
  by nothing that reports what a child has shown. Keep it so: phase 12's engine may use where a child begins,
  never what a grown-up saw.

**New with Reading Cove's later activities**

- **The synthesiser knows where its own sounds are, and will say.** Loaded with `include_alignments=True` (which
  needs the `onnx` package beside it) it gives, for a sentence, how many samples each sound of it took. The
  voice tool uses that to cut a word into its beats, and to write down when each sound of a slow word and each
  word of a sentence begins: three kinds of clip (`beats`, `slow` written "m-a-p", `read`) with **marks**, kept
  in the manifest and given to the game in `src/voice/marks/<world>.json`.
- **A word is cut in the silence before it, not where the synthesiser says it begins.** A sound that starts
  softly is under way a tenth of a second before that, and "ship" cut there was heard as "chip". And after
  "is," there is often no silence at all, so a word that is to be cut is carried by "The next word is that, …":
  the "t" closes before the comma. A take with no silence is thrown away and made again.
- **What is shown in time with a clip follows its marks** (`follow` in `src/game/worlds/reading-cove/script.ts`,
  `Writer.start` to begin a line without waiting for it). The part being shown is a beat like any other:
  `{ show: 'name', which: 'prompt', part }`. A picture gets `part`; the order board lights that place.
- **A clip that is fetched has not been said.** A world's `linesFor` now names every clip a step may say, so
  that one something moves in time with starts on time; they are fetched as the step arrives. A browser test
  that took a request for a clip as proof it was heard is wrong now. The voice tells the page each line as it
  begins to play (`SAID_EVENT`, `src/audio/index.ts`) and a test listens with `listenIn(page)`.
- **"Next" is in the page from the moment an answer is right**; only its appearing is delayed. A test that
  waits for it to be visible has waited for nothing. Wait for what is said, or what is lit.
- **A lesson that is live is added beside, never changed.** The functions that write the older lessons took
  new arguments with defaults that write what they always wrote; `npm run content` says at once if one differs
  from its mark. The clips of a live lesson may be made again (they are not content), and were.
- **An order can have a picture to go by.** A thing to make may carry `prompt.stimulus`; the order board now
  shows it above the places. A word to build is that: the picture of the word, and its letters to put in place.
- **A fault that does not compile proves nothing about a test.** The browser tests build first, with the type
  checker; a fault that leaves a variable unused fails the build, the tool prints no result, and "no failure"
  is easy to read into that. Write the fault so that it builds.
- **What a word is, is in the lexicon** (`src/art/lexicon.json`): the sound it starts with, its spelling sound
  by sound ("sh" is one entry), its beats. Rules, scripts and drawings read it there. A new picture needs its
  entry, or a test fails.

**Learned after the six worlds went live**

- **What a step keeps belongs to the step.** A board stays on the screen from one step to the next, so anything
  it remembers with plain `useState` is remembered into the next step. Use `useStepState(view.stepIndex, …)`.
  `useAgain` did not, and one tap on Glim changed every step after it.
- **Asking again is "again" only once the first showing has been seen through.** `useAgain(step)` gives
  `ask(seenThrough)`: a board that shows something first (a look, an order) says `false` while that is still to
  come or under way, and the script then plays from the top, showing and all.
- **Nothing can be answered until what is asked about has been shown.** A board that shows first takes no tap
  from the moment the question arrives until the showing is over: not while the words are said, and not in the
  pauses.
- **A button is not put in the place of another to restart an animation.** Make afresh what moves inside it. A
  replaced button drops a press that is under way and whatever was focused on it, and a test holding it is left
  holding nothing.
- **Whoever shows progress finds out who is playing.** `useFinishedLessons` asks if nobody has: any page can be
  the first thing opened.
- **A test that depends on a moment holds the clock.** `page.clock.install()` before the page is opened, then
  `holdClock(page)` and `watchFor(page, …)` (`e2e/fixtures.ts`): "before the look" and "between two lights"
  become places to stand in. A test that has to be quick enough will one day be too slow.
- **Before a release, rehearse the update**: `npm run rehearse:update -- origin/main`. It rebuilds `dist/`, so
  not while the browser tests are running.
- **A test that needed a second attempt in a green CI run is read, not shrugged at.** Four did, after the merge
  of the six worlds, and two of them were faults in the game. CI keeps a trace of a second attempt, so an
  artifact of tens of megabytes is the sign that there was one.

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

| For                                    | Look in                                                                                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How it should look, move and sound     | `docs/ART_DIRECTION.md`                                                                                                                                                                      |
| How it is built, and why               | `docs/ARCHITECTURE.md`                                                                                                                                                                       |
| What was run and what was found        | `docs/TEST_RESULTS.md`                                                                                                                                                                       |
| How it looks now, and what is weak     | `docs/QUALITY_REPORT.md`                                                                                                                                                                     |
| Phase status and gaps carried forward  | `docs/PROGRESS.md`                                                                                                                                                                           |
| Assets, licences, how assets are made  | `docs/ASSETS.md`, `docs/assets.manifest.json`                                                                                                                                                |
| Authoring content                      | `docs/CURRICULUM.md`                                                                                                                                                                         |
| Making and checking the voice          | `scripts/voice/README.md`                                                                                                                                                                    |
| Deploying                              | `docs/DEPLOYMENT.md`                                                                                                                                                                         |
| Screenshots of the running build       | `docs/review/phase-03/` (hub: `phase-02/`); the six worlds: `docs/review/worlds/`; then `music-lab/`, `number-garden/`, `reading-cove/`, `first-visit/`, `robot-ridge/` and `memory-forest/` |
| Getting it onto a phone; what to check | `docs/DEPLOYMENT.md`                                                                                                                                                                         |
| One island close up; the guide's sheet | `/studio/<island>`, `/studio/guide` in the build                                                                                                                                             |
