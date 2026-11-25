# Progress

The plan is the seventeen phases in `prompt-series/`. A phase is marked done only when its own acceptance checks
have been run and passed; the evidence is linked. `docs/CONTINUE_HERE.md` has the next action.

| Phase | Subject                                        | Status                                                                 |
| ----- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| 01    | Architecture, tooling, Vercel-ready foundation | **Done** (2026-11-22) — see below                                      |
| 02    | Visual identity and art pipeline               | **Done** (2026-11-22) — see below                                      |
| 03    | World and player journey, first vertical slice | **Done** (2026-11-23) — see below                                      |
| 04    | Audio and pre-reader onboarding                | **Partly done** (2026-11-23): the voice is built; onboarding is not    |
| 05    | Phonics                                        | **Partly done**: Reading Cove's four activities; no sentences          |
| 06    | Math                                           | **Partly done**: Number Garden's four activities; no numerals          |
| 07    | Robots (visual programming)                    | **Partly done**: Robot Ridge's four activities; no conditionals        |
| 08    | Memory                                         | **Partly done**: Memory Forest's four activities; no second-day recall |
| 09    | Inventors' lab                                 | **Partly done**: Inventor Island's four activities; no wind shelter    |
| 10    | Storytelling and geography                     | **Partly done**: Explorer Harbor's four activities; no globe           |
| 11    | Music and additional skills                    | Not started                                                            |
| 12    | Adaptive mastery engine                        | Not started (evidence rules exist)                                     |
| 13    | Parent dashboard                               | Not started (a basic grown-ups area exists)                            |
| 14    | Accessibility, privacy, performance            | Not started (foundations in place)                                     |
| 15    | Test and visual QA                             | Not started (test harness in place)                                    |
| 16    | Vercel release                                 | Not started as a phase. The owner has deployed `main`: see below       |
| 17    | Polish, expansion, hand-off                    | Not started                                                            |

"Partly done" is meant exactly: for each of those phases, every activity its world's page promised is built,
tested and playable, and the brief asked for more than that. The tables below say what, item by item.

## Phases 04 to 10 — what was asked, and what there is

The owner's request, made with screenshots of two world pages whose planned activities were marked "Later", was
to build each game and all worlds. Every one of the twenty-four planned activities on the six world pages is now
built, as **39 activities with 429 challenges**, and no world page says "Later" or "not open". The briefs for
these phases (`prompt-series/04` to `10`) describe more than those twenty-four activities; what follows is each
brief against what exists. Nothing in this section has been seen by a child, a teacher or a speech specialist,
and **no person has listened to any of the recordings**.

### Phase 04 — voice and onboarding

| Asked for                                                                 | What there is                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bundled voice clips for prompts, phonemes and feedback; no runtime speech | 395 recordings (4.3 MB), made ahead of time by `scripts/voice/make_voice.py` and shipped with the game. Nothing is synthesised in the browser and nothing is fetched from another site. **Isolated phonemes are deliberately not recorded** (see Phase 05) |
| First tap unlocks audio; failures, mute, interruption handled             | As Phase 03 built it, now carrying a voice: a line that cannot be heard is not waited for, and an activity that needs sound shows a gate with one button                                                                                                   |
| One narration at a time, replay, interrupt on leaving, music ducked       | One line at a time; Glim says it again; it stops on pause and on leaving; the cue sounds are turned down under it. There is no music                                                                                                                       |
| Accurate phoneme audio, validated by a parent or educator                 | **Not done.** Each clip was checked by a speech recogniser (`src/voice/manifest.json`); 13 single words were recognised only inside a sentence. The grown-ups' area lists every clip to listen to and mark. Nobody has                                     |
| Cache small clips, budgets, offline recovery                              | A clip is fetched when first wanted and kept by the service worker; budgets in `scripts/verify-dist.mjs` (60 kB a clip, 9 MB in all)                                                                                                                       |
| Three how-to-play demonstrations; skip, repeat, parent assist             | **Not built as a separate thing.** Every activity opens with its own demonstration, which can be repeated                                                                                                                                                  |
| Optional parent-only placement                                            | **Not built.** Nothing is locked, so nothing needs placing; every skill starts at "not yet observed"                                                                                                                                                       |
| A picture and a nickname, no real name, birth date or microphone          | As Phase 03 built it                                                                                                                                                                                                                                       |
| Help when repeated errors look like trouble with the interface            | **Not built.** After three wrong tries at a thing to make, the answer is shown and followed                                                                                                                                                                |

### Phase 05 — Reading Cove

| Asked for                                                         | What there is                                                                                                                                                                                   |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0: sounds around us, sound patterns, rhyme, syllables            | Two activities: what made that sound, and play it back. **No rhyme, no syllables**                                                                                                              |
| P0/P1: first sounds by ear                                        | Two activities, six first sounds (s, m, f, n, l, r), with the first sound drawn out                                                                                                             |
| P2: a letter shape linked to its sound                            | Four activities, **15 letters** (s m a t, p i n o, f l c h, u e r), lower case, each taught through key words. **No recording of a sound on its own**: a synthesiser cannot be trusted with one |
| P3: blending, by ear and then in print                            | Two activities: a word said slowly, then a printed word. **25 words are blended, 14 of them read in print**                                                                                     |
| P4: segmenting; P5: digraphs, sentences; P6: transfer, nonsense   | **Not built**                                                                                                                                                                                   |
| At least 10 correspondences, 25 CVC words, 10 decodable sentences | 15 letters; 25 words; **0 sentences**                                                                                                                                                           |
| No untaught letter in anything to be read                         | Enforced by the content rules (`src/content/rules/readingCove.ts`) and tested                                                                                                                   |
| Review list and sample pronunciations; audio is a release gate    | The list exists (grown-ups' area → _The voice_). **The gate is not passed: nobody has listened**                                                                                                |

### Phase 06 — Number Garden

| Asked for                                                     | What there is                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| M0: same and different sets, one-to-one                       | Same amount, up to three (Phase 03's activity)                                                                     |
| M1: seeing 1 to 3 at a glance, apart from size                | How many, at a glance: a group shown and covered; big and small things in the choices                              |
| M2: counting to 5, then 10; no advancing by random tapping    | One for each, to five and to ten: things are given one at a time and handed in; a wrong amount is counted back     |
| M3: frames, comparing, more, fewer, equal, rearrangement      | Which has more, which has fewer, two that are equal; rows, clusters, scatters and frames. **No number line**       |
| M4 to M7: numerals, bonds, adding and taking away, and beyond | **Not built.** No numeral appears anywhere                                                                         |
| At least 50 varied trials                                     | 77 challenges, written out from tables by a generator and checked by rules that every answer is the only right one |

### Phase 07 — Robot Ridge

| Asked for                                                  | What there is                                                                                                                      |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| R0: one arrow, one move                                    | One arrow, one move: each tap is carried out at once                                                                               |
| R1: two or three commands in a row; run, change, run again | Two and three steps in order                                                                                                       |
| R2: plans of 4 to 10 commands                              | **Not built**: rows are short, to fit a small phone                                                                                |
| R3: "do it again", with counts shown                       | Do it again: a short row done two, three or four times, shown as dots                                                              |
| R4: find the broken step                                   | Find the step that went wrong: the row runs wrong first, and one step is changed                                                   |
| R5: conditionals                                           | **Not built**                                                                                                                      |
| An interpreter, a solver, puzzles with a checked solution  | `src/engine/robot.ts`; every puzzle is solved by the solver when the pack is built, and a repeat puzzle cannot be done without one |
| 10 authored puzzles and a tested generator                 | 43 puzzles, three of them drawn from seeds                                                                                         |

### Phase 08 — Memory Forest

| Asked for                                              | What there is                                                                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| E0: pairs with the cards face up                       | Find the pairs begins face up, then face down                                                                                      |
| E1: 2 to 4 things hidden and recognised                | Which one was there?                                                                                                               |
| E2: things and their order                             | The same order: three or four, lit and named one after another                                                                     |
| E3: a strategy shown: groups, a silly story, places    | One activity for each: things that go together, who had what, what was where                                                       |
| E4: the child chooses a strategy                       | **Not built**                                                                                                                      |
| E5: recall after a delay, in another sitting           | One question at the end of an activity about its very start, counted on its own. **Nothing across sittings**                       |
| Recognition, order, cued and unaided recall kept apart | Seven skills, never added up; another look counts as help                                                                          |
| Nothing hidden can be read from the page               | What is covered is not in the page at all, and the cards to answer with are blank while things are on show; both are browser tests |

### Phase 09 — Inventor Island

| Asked for                                               | What there is                                                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Predict, test, compare, change one thing, test again    | Each activity is a guess that is tested in front of the child, and then a thing that does not work to be mended and tested                       |
| Bridge, ramp, balance, float                            | Four activities, 52 challenges                                                                                                                   |
| Wind shelter                                            | **Not built**                                                                                                                                    |
| Models with stated assumptions and fixtures             | `src/engine/models.ts`, small and deterministic, with tests. They are toy models; their limits are written in the file and not yet in a document |
| A parent-guided challenge away from the screen for each | Written for each activity, with what to watch out for, on the world's page. **A parent cannot record that it was done**                          |
| A portfolio card; a captured demonstration              | **Not built**                                                                                                                                    |

### Phase 10 — Explorer Harbor

| Asked for                                                           | What there is                                                                                                                                              |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A story composer: character, setting, goal, trouble, ending         | **Not built**                                                                                                                                              |
| Beginning, middle, end; what follows; why                           | Four activities: put a story in order and hear it told back; how does it end; what made it happen; what happens next. 8 stories and 8 changes, 37 drawings |
| Six branching story seeds                                           | **Not built**: the stories are fixed, three pictures each                                                                                                  |
| A page-turn animation                                               | A story is told back with each picture lifted in turn. **No page turns**                                                                                   |
| A globe or map with oceans and continents; countries, flags, people | **Not built.** There are four activities about a map of made-up islands: land and water, near and far. Nothing is about a real place or people             |
| Hotspots that are where the content says                            | The content rules work every map out again from its numbers, and a browser test checks where each place is drawn and what is drawn under it                |
| 7 region tasks, 15 country or landmark trials                       | **Not built**                                                                                                                                              |

### What was added for all of them

| What                                                                                               | Where                                                          |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| An engine with two kinds of challenge: a choice, and a thing to make that a rule judges            | `src/engine/tasks.ts`, `docs/ARCHITECTURE.md`                  |
| A lesson frame with a board for each kind of game, and worlds that bring boards of their own       | `src/game/lesson/`, `src/game/worlds/`                         |
| Content written out by generators and refused by rules unless every answer is the one right answer | `scripts/content/`, `src/content/rules/`, `docs/CURRICULUM.md` |
| A picture kit of 57 drawings, 15 drawn letters, and each world's own drawings                      | `src/art/`, `docs/ASSETS.md`                                   |
| World pages with every activity as a picture, and Glim pointing at the next thing not yet finished | `src/game/world/WorldView.tsx`, `src/game/progress.ts`         |
| The grown-ups' list of skills grouped by world; a list of every recording to listen to and mark    | `src/parent/`                                                  |

## Phase 03 — what was asked, and where the evidence is

Added by the owner for this phase: **it must work on Android and iOS devices when deployed on Vercel.**

### The flow

| Asked for                                                           | Delivered                                                                                                                                     | Evidence                                                      |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A simple splash animation                                           | The front door: the card springs in front of the map, Glim waves, the pictures pop in                                                         | `src/app/FrontDoor.tsx`, `docs/review/phase-03/door-1-*.jpg`  |
| Select a locally stored avatar                                      | One tap on a picture: the players this device knows, or six pictures to choose from on a first visit (the tap creates the player)             | `e2e/journey.spec.ts`, `door-2-who-is-playing-*.jpg`          |
| Choose a world, or be gently guided to one                          | The map; Glim says hello, then points at the island that has something to play, which also has the sun tag                                    | `door-3-arriving-on-the-map-*.jpg`, `e2e/journey.spec.ts`     |
| The mascot demonstrates a task                                      | Glim counts the group, then its match, with the same notes, and lights them together                                                          | `src/game/lesson/script.ts`, `lesson-1-*`, `lesson-2-*`       |
| The child interacts; feedback explains or reveals the right idea    | A right answer is counted on both sides; a wrong one is counted against the group — a different number of notes — and set aside               | `lesson-4-*`, `lesson-6-*`, `tests/game/lessonScript.test.ts` |
| Celebration, then the next challenge or home                        | Glim is glad of each right answer; the end is calm: the island, a flower for each thing done, "Again" and the way home                        | `lesson-9-finished-*.jpg`                                     |
| Pictures, animation, sounds and a visible repeat-instruction button | Nothing needs reading. Glim is the "show me again" button, with a badge that says so                                                          | `tooltip-2-*.jpg`, `e2e/journey.spec.ts`                      |
| Settings behind a separate, intentional parental control            | Unchanged: the grown-ups' area behind its press-and-hold, not offered inside an activity. The two family switches are also on the pause sheet | `e2e/grownups.spec.ts`, `lesson-8-paused-*.jpg`               |

### Implement

| Asked for                                                                                                               | Delivered                                                                                                                                                                                           | Evidence                                                        |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Animated hub with clear interactable landmarks for the six worlds                                                       | Phase 02's map, now behind a front door and with the 3D held back until the door opens                                                                                                              | `e2e/hub.spec.ts`, `click-map-2-map-*.jpg`                      |
| Distinct, meaningful illustrations of what tapping each world does; hover, focus and touch states; keyboard activation  | Each world's page pins its emblem to the picture of the place, and an open world shows an example of the activity from the lesson's own demonstration. States and keyboard as in Phase 02           | `world-open-*.jpg`, `world-not-open-*.jpg`, `e2e/shell.spec.ts` |
| A polished cross-world lesson frame; shared pause, replay and home controls; soft transitions; feedback and celebration | `src/game/lesson/`: a frame that knows nothing of amounts (a world says what can be counted); home, help, pause; Glim replays; pages fade in; no confetti anywhere                                  | `docs/ARCHITECTURE.md` → _The lesson frame_, `lesson-*.jpg`     |
| One complete playable slice of 4–6 authored visual challenges that teaches, with no literacy needed                     | Number Garden's "same amount, up to three": six steps a sitting (one shown, two guided, three alone) from eight authored challenges. The suggested first-sound slice needs a voice: Phase 04 and 05 | `docs/CURRICULUM.md` → _The first activity as it is played_     |
| Persist the session; play start → demo → guided → independent → calm completion → hub; a reload resumes safely          | As asked, including a refresh in the middle of a step with choices set aside and help used                                                                                                          | `e2e/journey.spec.ts`, `e2e/lesson.spec.ts`                     |
| No fake activity buttons; an honest, parent-readable "coming later" for worlds not built                                | Five worlds say "not open yet", show what is planned, and offer nothing to tap                                                                                                                      | `e2e/shell.spec.ts`, `world-not-open-*.jpg`                     |

### Interaction contract

| Asked for                                               | How it is met                                                                                                                                                                                                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Low motor precision; targets that do not overlap        | Choices are 148 pixels or more on the tightest profile and 107 on the flattest phone; every child's control is 56 or more (23 click maps); a tap counts while another finger rests on the screen; islands never touch, down to a page 256 pixels high |
| No timed questions, no speed-based accuracy             | Nothing is timed. Response time is recorded and used for nothing                                                                                                                                                                                      |
| A wrong answer brings a scaffold, not a red X or a loss | The choice is counted against the group and set aside (one choice fewer); with one left it is shown. Nothing is taken away                                                                                                                            |
| The child can leave at any point                        | Home is in the bar and on the pause sheet; the place is kept                                                                                                                                                                                          |
| No double-submit races                                  | Three guards (runner, engine, store), tested with two taps in one tick                                                                                                                                                                                |

### Acceptance

| Asked for                                                                           | Done                                                                                                                                          |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| E2E (a): a brand-new pre-reader completes a concept without text, desktop and touch | `e2e/journey.spec.ts`, first test: from the front door to the end and home, acting on what is drawn. Desktop, phone, Pixel 7, iPhone 13, iPad |
| E2E (b): the hint and wrong-answer path, and pause and resume                       | `e2e/journey.spec.ts`, third and fourth tests: a wrong answer, "show me again", help in steps, pause, a refresh, leaving and coming back      |
| Capture real interactions, click maps, tooltips and responsive screens              | `docs/review/phase-03/`: 101 pictures from the running build, 23 of them click maps, 3 tooltips, at nine screen sizes                         |
| Document actual content ids and replay-safe progression                             | `docs/CURRICULUM.md` → _The first activity as it is played_                                                                                   |
| Commit                                                                              | Branch `claude/zealous-carson-qyiipa`, pull request #4                                                                                        |

### The requirement about phones and Vercel

Met as far as code, emulation and reasoning go; **not verified on any device, and nothing is deployed.** What was
done, how each part was checked, and what only a device can tell are in `docs/QUALITY_REPORT.md` → _Phones_. How to
get it onto a phone, and the sixteen things to try there, are in `docs/DEPLOYMENT.md` → _Trying it on a real phone
and tablet_.

A second look, after the phase was first written up, asked what a phone does that the emulated devices do not,
and found three faults they had passed: a tap was ignored whenever another finger rested on the screen; on a
common Android phone held sideways the map's islands were 70 pixels wide and touching; and a world's page lay
under an iPhone's notch. All three are fixed and tested (`e2e/phones.spec.ts`, `docs/QUALITY_REPORT.md` → _A
second look, with a phone in mind_). That the emulated devices could pass all three is the best reason there is
to put it on a phone.

### Beyond the brief (and why)

- **A notice for a browser too old to run the game.** A blank page on an old iPad would otherwise be the whole
  story.
- **Click maps as part of `npm run screens`.** They found two controls under size in their first run.
- **Named device profiles in the browser tests.** Asked for by the requirement, in effect.
- **An answer to taps made beside a resting finger** (`src/app/touch.ts`). Nobody asked for it; a child holding a
  phone needs it, and without it Chrome answers nothing while a thumb is on the screen.
- **A fifth arrangement of the map, one row**, for the little height a phone's browser leaves when held sideways.
- **A way to give a page a notch in a test** (`giveNotch` in `e2e/fixtures.ts`), since no desktop browser has one.

## Phase 02 — what was asked, and where the evidence is

### Produce

| #   | Asked for                                                                                                                                                                           | Delivered                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | `docs/ART_DIRECTION.md`: mood, silhouettes, 6–8 role colours, contrast, typography, lighting, staging, character turnaround and emotion set, 2D language, transitions, sound motifs | Written as a standard: each rule with its reason. Eight colour roles with measured contrast; a silhouette table for the seven islands; the guide's construction, six states and three views                                                                                                                       | `docs/ART_DIRECTION.md`, `docs/review/phase-02/guide-character-sheet-1366x1080.jpg`                            |
| 2   | Asset manifest, source and licence tracking, a pipeline for vector, texture, sprite, low-poly 3D, shaders and audio; no hot links, nothing unsourced                                | `docs/assets.manifest.json`, kept true by tests; one way to make each kind of asset, each with its check                                                                                                                                                                                                          | `docs/ASSETS.md`, `tests/config/assets.test.ts`, `tests/render/sprites.test.ts`                                |
| 3   | A real-time rendered hero hub with depth, interaction-ready elements and ambient animation                                                                                          | A lighthouse and six modelled islands in a moving sea, drawn in real time; each island a link that lifts when pointed at; water, wind, moving landmarks, boats, gulls, clouds                                                                                                                                     | `src/render/hub3d/`, `e2e/hub.spec.ts`, `docs/review/phase-02/hub-3d-*.jpg`, `motion-four-frames-1366x768.jpg` |
| 4   | One character with idle, celebrate, think, gentle retry and point states, transparent, responsive to events                                                                         | Glim: one rigged SVG with those five states and a wave; reacts to the lesson's events and to a tap on the hub                                                                                                                                                                                                     | `src/ui/Guide.tsx`, `tests/ui/guide.test.tsx`, `e2e/lesson.spec.ts`, `e2e/hub.spec.ts`                         |
| 5   | Semantic lighting, cast and received shadows, atmosphere, animated foliage, clouds and water, spatial hierarchy, readable hotspots                                                  | One warm sun and cool fill; a shadow map drawn once, contact shade on every tier; haze and a vignette; wind in everything that grows; clouds with shadows; a water shader with shallows, foam and rings                                                                                                           | `docs/ART_DIRECTION.md` → _Light_, _Materials_, _Motion_; `src/render/hub3d/{paint,Sea,stage}.ts*`             |
| 6   | Low, medium and high tiers; capped pixel ratio; GPU resources managed and disposed; reduced motion; a no-WebGL fallback                                                             | Three tiers (the lowest also cuts curves coarser and drops the water's decoration); pixel ratio capped at 1, 1.5, 2 and stepped down if frames are slow; everything disposed with the scene; one still frame under calm motion; the hub as a picture, rendered from the same models, wherever 3D is not available | `src/render/quality.ts`, `e2e/hub.spec.ts`, `docs/QUALITY_REPORT.md` → _Performance_                           |
| 7   | Child-scale UI: targets of 48–64 px or more, legible contrast, no instruction only in 3D, icons with optional labels, clear feedback                                                | The whole island is the target (96 px square at the least); names in ink on white at 13:1; no words in the 3D scene at all; each name with an icon; press, lift and a sound for every tap                                                                                                                         | `tests/render/archipelago.test.ts`, `e2e/shell.spec.ts`, `e2e/a11y.spec.ts`                                    |

### The art gate

| Asked for                                                                                                                                    | Done                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Screenshots at 390×844, 844×390, 768×1024, 1366×768 and a 360-pixel-wide screen                                                              | `docs/review/phase-02/` (and `round-1/` for the first round)                                                                                                                                                                                                                                                 |
| Each rated 1–5 in nine categories; anything under 4 recorded                                                                                 | `docs/QUALITY_REPORT.md` → _The art review_. Home screen: 4 or more in the six categories that can be rated here. Recorded below 4: the picture's liveliness, the low tier's craft and depth, and the activity screen. **Not rated at all: motion in 3D, device performance, child comprehension** — and why |
| Iterate at least twice                                                                                                                       | Two rated rounds, after about fifteen earlier corrections; all in the "seen — cause — fix" log                                                                                                                                                                                                               |
| No untextured primitive-only islands; no emoji as art; no stock hero image over an inert UI; no giant empty gradients; no illegible hotspots | Modelled, painted, brush-textured islands; all art drawn or modelled for this project; the picture is the interface; the sea is never empty; every hotspot is an island with its name                                                                                                                        |
| Check actual interaction and pointer hit areas                                                                                               | Browser tests hit-test five points on every island at five screen sizes, tap landmarks and names, and tap the lighthouse to see that nothing happens                                                                                                                                                         |
| Save before and after screenshots and commit                                                                                                 | `docs/review/phase-01/` (before), `phase-02/round-1/`, `phase-02/`                                                                                                                                                                                                                                           |

### Beyond the brief (and why)

- **The dock of tiles is gone.** With the worlds on the map, a second menu of them was a second way to do one thing.
- **The fallback is rendered from the 3D models**, not drawn separately. Phase 01's two hubs were two different
  pictures; one set of models now makes both.
- **A world's page shows its island.** One line of continuity until Phase 03 builds the journey.
- **A studio route** (`/studio/<island>`, `/studio/guide`), linked from nowhere: it is how the pictures are rendered
  and how the art is reviewed.

## Phase 01 — what was asked, and where the evidence is

### Implement now

| #   | Asked for                                                                                                       | Delivered                                                                                                                                                                                    | Evidence                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Project structure                                                                                               | `src/{app,game,engine,content,render,ui,audio,storage,parent}`, `public/assets`, `tests`, `e2e`, `docs`, `scripts`                                                                           | the tree; layer rules in `eslint.config.js`                                               |
| 2   | Home shell, routes, reduced-motion and sound toggles, focus-visible controls, error boundary, no-WebGL fallback | Six-world hub, five routes with a History-API router, both toggles (remembered), one focus ring, boundaries around the routed view and the hub, an illustrated hub that is also the fallback | `e2e/shell.spec.ts`, `e2e/hub.spec.ts`, `e2e/a11y.spec.ts`                                |
| 3   | Typed Skill, Lesson, Challenge, Attempt, Evidence, Profile, LessonSession; stable IDs; content versioning       | Valibot schemas with inferred types; `schemaVersion`, `contentVersion`, lesson `version`; ID conventions                                                                                     | `src/engine/schema.ts`, `docs/CURRICULUM.md`, `tests/content`                             |
| 4   | `getNextChallenge`, `submitAttempt`, `getHint`, `getSkillEvidence`; no faked mastery                            | A pure, seeded engine; evidence derived from an append-only attempt log; watching, hints and retries never count as independent                                                              | `tests/engine/*` (incl. property tests), `e2e/lesson.spec.ts`                             |
| 5   | Profile CRUD; session save and restore; nothing on a server                                                     | Repository over IndexedDB → localStorage → memory; migrations; export/import; resume after refresh                                                                                           | `tests/storage/*`, `e2e/grownups.spec.ts`, `e2e/lesson.spec.ts`, `e2e/resilience.spec.ts` |
| 6   | 3D hub lazy-loaded; each module loads on entry; performance instrumentation without telemetry                   | `three`, `r3f`, `Hub3D` chunks after the shell; world code and content on entering the world; on-device diagnostics                                                                          | `npm run verify:dist`, `e2e/hub.spec.ts`, Grown-ups → Diagnostics                         |
| 7   | Scripts: dev, typecheck, lint, test, test:e2e, build, preview, verify:release                                   | All present, plus format, verify:dist, screens, icons                                                                                                                                        | `package.json`, `README.md`                                                               |
| 8   | `vercel.json` for history routes, cache rules, security headers, without breaking service-worker updates        | One rewrite, immutable caching for hashed files, no caching of `sw.js`, strict CSP and other headers; preview and production builds are identical                                            | `vercel.json`, `tests/config/vercel.test.ts`, `e2e/smoke.spec.ts`, `docs/DEPLOYMENT.md`   |

### Deliverables

| Asked for                                             | Where                                                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| README startup instructions                           | `README.md`                                                                         |
| `docs/ARCHITECTURE.md`                                | written                                                                             |
| `docs/CURRICULUM.md` skeleton                         | written (one skill, one lesson recorded; the rest marked as planned)                |
| `docs/CONTINUE_HERE.md`, `docs/PROGRESS.md`           | written                                                                             |
| Sample versioned challenge and passing engine test    | `src/content/packs/number-garden.v1.json`, `tests/engine/session.test.ts`           |
| True Vite production build                            | `npm run build` → `dist/`; inspected by `npm run verify:dist`                       |
| Shell correct at 390×844, 844×390, 768×1024, 1366×768 | Browser tests on those four and on 360×740; screenshots in `docs/review/phase-01/`  |
| Also kept, as the series README asks                  | `docs/ART_DIRECTION.md` (interim), `docs/QUALITY_REPORT.md`, `docs/TEST_RESULTS.md` |
| Added because they were needed                        | `docs/DEPLOYMENT.md`, `docs/ASSETS.md`                                              |

### Verification

| Asked for                                       | Done                                                                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Lint, typecheck, unit tests, build              | Yes — `docs/TEST_RESULTS.md`                                                                               |
| Preview server and Playwright on the shell      | Yes — production build served with the `vercel.json` rules; Chromium locally and in CI, WebKit in CI       |
| Screenshots at phone portrait and desktop       | Yes, plus phone landscape, tablet and a 360 px phone — `docs/review/phase-01/`                             |
| No hydration or console errors                  | Every browser test fails on any console error or warning, page error, failed request or outside request    |
| Simulate refresh and lost storage               | Yes — `e2e/lesson.spec.ts`, `e2e/resilience.spec.ts`                                                       |
| State what is and is not verified in iOS Safari | `docs/TEST_RESULTS.md` → _iOS Safari_. In short: WebKit on Linux in CI only; no iPhone, no iPad, no Safari |
| Commit                                          | Branch `claude/zealous-carson-qyiipa`, pull request #1                                                     |
| Do not claim a Vercel deployment                | None exists; none is claimed                                                                               |

### Beyond the brief (and why)

- **A playable sample activity** (Number Garden, "same amount"). The engine had to be proven end to end through real
  touches, saving and resuming — a headless engine with no screen would have been "a theoretical learning engine".
- **A basic grown-ups area.** Profile CRUD, reset, export and import need somewhere to live and to be tested.
- **A service worker.** The brief allows it once its caching policy is tested; it is, in unit tests and in a real
  browser offline.
- **A local server that applies `vercel.json`.** Otherwise the headers and rewrites would have gone untested until a
  first deployment.

### Known gaps carried forward (updated after the six worlds went live)

| Gap                                                                                                                                                                                                                                                                                                                                                                                                                | Owner phase |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| **Frame rate has still only been measured on a software renderer, never on a real GPU or a phone** (and there it is poor)                                                                                                                                                                                                                                                                                          | owner, 14   |
| The guide's name, "Glim", has not been checked for prior use                                                                                                                                                                                                                                                                                                                                                       | owner       |
| **Nothing has been played on a real phone or tablet by this project's own testing**; the owner has opened the live site on an iPhone. Sound on iOS, long presses, the notch, real GPUs                                                                                                                                                                                                                             | owner, 16   |
| The answer to a tap made beside a resting finger is shown in Chromium only; on iOS neither the fault nor the fix has been seen                                                                                                                                                                                                                                                                                     | owner, 15   |
| The answer to a slow press is unit-tested only: a browser on a desk clicks after one, and a phone's is known not to                                                                                                                                                                                                                                                                                                | owner, 15   |
| On the two narrowest phones held sideways an island is 81 or 90 pixels wide, not 96                                                                                                                                                                                                                                                                                                                                | 17          |
| Two fingers can zoom the page everywhere, on purpose; whether to forbid it on the map and in an activity is undecided                                                                                                                                                                                                                                                                                              | owner       |
| Going to an island is a fade, not a journey; nothing on an island answers a tap except by rising                                                                                                                                                                                                                                                                                                                   | 17          |
| The hub's picture has still islands                                                                                                                                                                                                                                                                                                                                                                                | 17          |
| The voice is synthesised and unheard: no person has listened to any recording, and no single letter-sound is recorded                                                                                                                                                                                                                                                                                              | 04, 05      |
| 39 activities and 429 challenges that no early-years teacher has reviewed and no child has played                                                                                                                                                                                                                                                                                                                  | 05–11       |
| Evidence thresholds are product heuristics; no spaced review, no difficulty adjustment                                                                                                                                                                                                                                                                                                                             | 12          |
| Grown-ups area: no session limits, no per-skill history view, no printable summary                                                                                                                                                                                                                                                                                                                                 | 13          |
| `navigator.storage.persist()` is not requested; Safari may evict unused sites' data                                                                                                                                                                                                                                                                                                                                | 13, 14      |
| No update prompt when a new version is waiting: a tab, or a copy on the home screen, that is left open stays on the old build until it is loaded again                                                                                                                                                                                                                                                             | 14          |
| The first screen's own files are still preloaded from `index.html`; whether a failed one recovers on reload in Safari is untested                                                                                                                                                                                                                                                                                  | 14          |
| No privacy/legal review; no dependency licence audit                                                                                                                                                                                                                                                                                                                                                               | 14          |
| No image-comparison tests; no Firefox; no physical devices                                                                                                                                                                                                                                                                                                                                                         | 15          |
| In CI, a browser test that follows a 3D test has taken up to 44.5 of its 60 seconds (see `docs/TEST_RESULTS.md`)                                                                                                                                                                                                                                                                                                   | 15          |
| Four times in CI a test's first page in WebKit has waited a minute and arrived at once at the second attempt. Not explained. The fourth time the test could say what the server saw: the request arrived at once and was answered in under a millisecond, so the page was sent and the browser never read it. That clears the preview server and the game; what in WebKit, as CI drives it, does this is not known | 15          |
| GitHub Actions are pinned to major versions, not commit SHAs                                                                                                                                                                                                                                                                                                                                                       | 16          |
| The update from one build to the next is rehearsed by hand before a release (`npm run rehearse:update`), in Chromium only; CI does not do it                                                                                                                                                                                                                                                                       | 15, 16      |
| CI's Chromium job for the desktop took 31.7 of the 40 minutes it is allowed before its two small phones were moved to the other Chromium job. Each should now take about 25; as activities are added, the desktop screen will need a job of its own                                                                                                                                                                | 15          |

## Log

- **2026-11-25** — The six worlds are live, and what going live showed. The owner merged pull request #6 on
  2026-11-23; Vercel deployed it, and the live site was checked that day: all six worlds open, 39 activities,
  each new world's first activity fetching its recordings from the site, 52 browser tests against the address
  (`docs/DEPLOYMENT.md`). Two things were then done that no brief names and the requirement about phones asks
  for. **An update was rehearsed**: a browser that had the build before the six worlds, with play in it and
  tabs left open, was given the six worlds at the same address. Everything about the update held, and one
  thing did not: a world's page opened by its own address showed nothing as finished, as it had since Phase 03.
  **And the run of CI on `main` was read, although it was green**: four tests in one WebKit job had passed
  only at their second attempt. One had tapped in a pause that should not have taken a tap, and from it came
  the worst fault found so far: asking Glim to say it again was remembered from step to step, so that after
  one tap nothing was shown first for the rest of an activity — in every game that shows something and then
  asks about it. One was a button the game replaced each time it counted. One was the tests misreading
  WebKit. The fourth, a page that waited a minute to load, was not explained, for the third time; it was made
  to say what the server saw, and on its fourth time, in this pull request's own CI, it did: the server had
  answered at once, and the browser never read the answer. All of it is fixed in the pull request after #6, each fix with a test that fails on the
  code as it was, and the rehearsal is kept as `npm run rehearse:update`. No phase changed its status.

- **2026-11-23** — Phases 04 to 10, as far as the six world pages promised. Asked to build each game and all
  worlds, the engine was first widened from questions with choices to things a child makes and a rule judges, and
  the lesson frame from one board to a board for each kind of game. Then the worlds: Number Garden's other three
  activities, Reading Cove, Memory Forest and Explorer Harbor in this session's own tree, Robot Ridge and Inventor
  Island by two agents working in copies of the repository, whose work was read, merged and tested with the
  rest. A voice was added: 395 recordings made ahead of time and checked by a speech recogniser, which rejected a
  number of lines that were then reworded; no person has listened to any of them. Each brief asked for more than
  its world page did, and the tables above say what is missing. The owner connected the repository to Vercel
  and, while the last worlds were being built, merged pull request #5: the engine, the voice and Number Garden's
  seven activities are on `main` and live, and the smoke tests pass against the live site. The other five
  worlds are on pull request [#6](https://github.com/JaredVogler2/Training_Academy/pull/6) and are
  not deployed.

- **2026-11-23** — Phase 03 implemented and verified in browsers, with the owner's added requirement that it work
  on Android and iOS devices on a Vercel deployment. A visit now opens on a front door and runs through to the end
  of an activity and home; the lesson frame is the one every world will use. Sound, touch and layout were reworked
  for phones, and the tests run as a Pixel 7, an iPhone 13 and an iPad. None of it has been on a device, and
  nothing is deployed: `docs/DEPLOYMENT.md` says how to change that and what to check. A second look the same
  day, asking what a phone does that an emulated one does not, found and fixed three faults the emulated devices
  had passed: taps ignored while another finger rests on the screen, a cramped and overlapping map in the little
  height an Android phone leaves when held sideways, and a world's page under an iPhone's notch.

- **2026-11-22** — Phase 02 implemented and verified. The hub became the map: layout arithmetic shared by 3D, picture
  and links; a modelling kit, one painted material and a water shader; seven island models; the picture rendered
  from them; Glim; an art standard, an asset manifest and a pipeline; two rated rounds of review. What the tests and
  measurements found along the way is in `docs/TEST_RESULTS.md` and `docs/QUALITY_REPORT.md`. CI passed in Chromium
  and in WebKit on every run, and the pull request was merged as `65a137b`. Reading the times of those green runs
  showed that the browser tests of the 3D scene had less time than they sometimes need, which was put right. (A
  trial of running them in order was taken out again; the CI machine varies too much from run to run for it to
  have shown anything.) The largest thing still unknown is the same as before: how it runs on a real device.

- **2026-11-22** — Phase 01 implemented and verified. Toolchain; engine and first content pack; storage; shell, hub
  (3D and illustrated), sample activity, grown-ups area; release tooling and service worker; browser tests on five
  screen shapes; CI with Chromium and WebKit. CI earned its keep: WebKit found a long button label that widened the
  page (hidden by Chromium's phone emulation) and a lost download that a reload could not recover from; the
  Chromium run on the slower CI machine exposed an idle home screen that kept a whole CPU core busy. All three were
  fixed in the game, not just in the tests.
