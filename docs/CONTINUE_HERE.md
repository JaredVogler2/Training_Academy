# Continue here

**Seven worlds are built: the six islands, and the Music Lab in the lighthouse. Phases 01 to 03 are complete;
phases 04 to 10 are each partly done; phase 11 is built and unheard. The rest of the plan is being built on one
pull request, [#8](https://github.com/JaredVogler2/Training_Academy/pull/8), which is open and is not to be
merged until it says it is finished.**

- **Date:** 2026-11-25
- **What is live:** `main`, at `https://training-academy-dun.vercel.app`: the six islands and the Music Lab,
  45 activities. The owner merged pull request #8 on 2026-11-25 as it stood at its first commit, which was the
  Music Lab and its six activities. The live site was checked half an hour later: Vercel's production
  deployment of `765be14` was ready, and 55 of 56 browser tests passed against the address as a desktop, a
  phone and a Pixel 7. The one that failed is the test of the Music Lab's room, which is not live: the test was
  ahead of the site. That update was not rehearsed before the merge.
- **What is not live:** everything on pull request #9, which is open: the Music Lab's room to play in, the fix
  for the sideways layout of "Which has more?", and Number Garden's eleven new activities (numerals, the
  numbers in order, adding and taking away).
- **The owner's instruction for this stretch of work** (2026-11-25): build all that is left, in the order
  recommended, and the owner will review all of it at once, sounds included, when it is complete. The order:
  the Music Lab; numerals and the number line in Number Garden; rhyme, syllables, letter pairs and sentences in
  Reading Cove; the first-visit help that phase 04 asks for; the gaps in the other four worlds; then phases 12
  to 17. `docs/PROGRESS.md` says how far that has got.

## The one thing that matters most now

**Nobody has listened to anything, and nobody has played.** The game talks — 484 recordings, made by a speech
synthesiser ahead of time and shipped with it, each checked by a speech recogniser, which is a machine's
opinion of the words and nothing more — and now it also plays notes, which are made by arithmetic at the moment
they sound and which no ear has checked at all. The briefs call the accuracy of the audio a release gate. That
gate has not been passed, and with the Music Lab it matters more: three of its activities are nothing but
listening.

What to do about the voice is already in the game: **Grown-ups → _The voice: listen to every recording_** plays
each clip beside what it should say and lets it be marked as sounding right or wrong. For the notes there is no
such list: open the Music Lab, tap _Just play_, and play the bars from left to right. They should climb a scale,
each sounding like a small struck bar; the drum should be a soft low knock; the birds in _High and low_ should
sound like a whistle. If they do not, say what they sound like: every one of them is a few numbers in
`src/audio/audioEngine.ts`.

The same is true of the pictures and the activities themselves. Each was looked at on a desk at several sizes,
and no child has seen one.

## The state, in one paragraph

A static React and TypeScript app builds to `dist/` and runs under the same headers and routing that `vercel.json`
gives it. A visit opens on a front door; behind it is the map, six islands round a lighthouse, and all seven
places are open. A place's page offers the next thing to play as one large button and every activity as a
picture. There are **56 activities and 639 challenges**: sounds, letters and blending in Reading Cove; amounts,
counting and comparing, then numerals, the numbers in order and adding and taking away in Number Garden; a
robot to steer and a row of steps to mend in Robot Ridge; pairs,
hidden things, orders and three ways to remember in Memory Forest; guesses that are tested and things to mend
in Inventor Island; stories to put in order, why things happen and a map to answer on in Explorer Harbor; and in
the Music Lab high and low, the same or different, a beat to tap, notes to play back, a tune to know again and a
tune to make, with a room to play in freely. Each activity is shown first by Glim, then tried with help at hand,
then tried alone, and what a child did alone and at the first try is kept apart from everything else. Every
challenge is written out in a file, made from tables by a generator and refused by its world's rules unless its
answer is right. Everything is saved on the device.

## Verified

- Locally: format, lint, typecheck, **1711 unit tests**, the production build and its **1270 build checks**.
  The whole browser suite in Chromium on seven screen shapes was run on the tree with Number Garden's numerals
  in it: **986 tests, 853 passed, 133 skipped by design, none failed, none run twice** (34 minutes). Three
  fixes came after that run, from what CI said of the push before (below), with 54 more browser tests; the
  specs they touch were run again on every screen and passed. The whole suite on the final tree, and WebKit
  at all, are CI's: `docs/TEST_RESULTS.md` says what CI made of it.
- **CI's last two runs each found a fault in the game, and both are fixed here.** A run that was green had
  one test that needed a second go: a dialog asked for again the instant it was cancelled shut itself, and the
  pause sheet was written the same way. And the run on this pull request's first push failed: on an iPhone 13
  held sideways the chime bars in the Music Lab's room were 47 points wide.
- **The tests that passed first time were made to fail.** The hold on answers while a question is still being
  played, the row the bars stand in, the allowance for a steady lateness, the count of taps too many, the
  second answer to one tap: each was taken out of the code and its test seen to fail. `docs/TEST_RESULTS.md`
  lists them.
- **Every activity is played to its end by a browser test**, with the answers its content says are right
  (`e2e/everything.spec.ts`; Robot Ridge and Inventor Island in their own specs). The beat is tapped the way a
  person taps it: from the first beats heard, each tap begun a little ahead.
- Every content pack is exactly what its generator writes, and every rule that can refuse a challenge has been
  shown to fire (`tests/content/`): 32 of them are the Music Lab's.
- Every browser test also fails on any console error or warning, failed request, or request to another origin.
- **The live site**, as above: `main` after pull request #8. `docs/DEPLOYMENT.md` has the check.
- **The update from what is live to this tree was rehearsed** (`npm run rehearse:update -- origin/main`), in
  Chromium: 18 of 18, after it had found a fault at 16 of 18 and that was fixed. Rehearse it again after any
  later change to content or to what is stored.

## Not verified — read this before relying on anything

- **Sound, of any kind.** No person has listened to a recording or a note (above). That the notes are in tune
  with their names is arithmetic and is tested; that they are pleasant, or even plainly notes on a phone's
  speaker, is not known. The drum is tuned to 150 hertz with a knock above it because a phone gives almost
  nothing below middle C; whether that was enough is for a phone to say.
- **Keeping the beat, by a child.** The allowance was chosen from what is written about young children's
  tapping and from arithmetic. Whether a four-year-old who is keeping the beat passes, and one who is not does
  not, is not known.
- **The numerals' shapes, and whether a wrong answer counted out is a help.** The numerals are drawn here, in
  one school's hand (an open 4, a 7 with no bar, a 9 with a straight stick); a child taught another will meet
  two. And every wrong answer in the new Number Garden activities is answered by counting it, which takes
  time, and which no child has sat through.
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
5. **Decide the guide's name.** "Glim" is provisional and unchecked; it is one string in `src/app/strings.ts`.

Pull request #9 has a preview on Vercel (behind the owner's Vercel login) for looking at any of this before it
is merged.

## The next action

If this session is the one still building: carry on down the order above. The Music Lab and Number Garden's
numerals are done; **next is Reading Cove** (rhyme, syllables, segmenting, letter pairs, sentences), then the
first-visit help of phase 04, the gaps in the other four worlds, and phases 12 to 17. `docs/PROGRESS.md` → the
table at the top says which phases are done; its _Known gaps_ table says what each world still lacks.

If it is a new session:

> Read prompt-series/README.md and prompt-series/00_MASTER_BRIEF.md, then docs/CONTINUE_HERE.md,
> docs/PROGRESS.md, docs/CURRICULUM.md and docs/ARCHITECTURE.md. Pull request #9 is open: carry on with what
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
  merged the last pull request without warning. `npm run rehearse:update -- origin/main` found that adding
  activities to a world sent a child back to the start of an unfinished one. A place is now kept by the
  lesson's own version, and a lesson cannot change without one: `npm run content` refuses it
  (`src/content/lessons.lock.json`). To change a lesson that is live, give it a new version in its generator.
- **The game's size and the content's size are budgeted apart** (`scripts/verify-dist.mjs`). Content is meant
  to grow; the game's own code is not meant to jump.
- **The first screen's script is 105 kB of the 110 it is allowed**, and what each world offers
  (`src/game/worlds.ts`) is in it, grown-ups' text and all. More activities will need that text moved out of
  the first load.
- **Testing a deployment, name the screens**: `BASE_URL=… npx playwright test --project=desktop
--project=phone`. Without them the layout tests of five more screens run against the site as well.

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

| For                                    | Look in                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| How it should look, move and sound     | `docs/ART_DIRECTION.md`                                                                                                   |
| How it is built, and why               | `docs/ARCHITECTURE.md`                                                                                                    |
| What was run and what was found        | `docs/TEST_RESULTS.md`                                                                                                    |
| How it looks now, and what is weak     | `docs/QUALITY_REPORT.md`                                                                                                  |
| Phase status and gaps carried forward  | `docs/PROGRESS.md`                                                                                                        |
| Assets, licences, how assets are made  | `docs/ASSETS.md`, `docs/assets.manifest.json`                                                                             |
| Authoring content                      | `docs/CURRICULUM.md`                                                                                                      |
| Making and checking the voice          | `scripts/voice/README.md`                                                                                                 |
| Deploying                              | `docs/DEPLOYMENT.md`                                                                                                      |
| Screenshots of the running build       | `docs/review/phase-03/` (hub: `phase-02/`); the six worlds: `docs/review/worlds/`; then `music-lab/` and `number-garden/` |
| Getting it onto a phone; what to check | `docs/DEPLOYMENT.md`                                                                                                      |
| One island close up; the guide's sheet | `/studio/<island>`, `/studio/guide` in the build                                                                          |
