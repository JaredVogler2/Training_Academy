# Curriculum

**Status: six worlds, a first pass through each.** Every activity the six world pages promised is authored and
playable. Counts in this document are of real, shipped content, and the tests pin the ones quoted most.

|                              | Authored and tested |
| ---------------------------- | ------------------- |
| Worlds with playable content | 6 of 6              |
| Activities (lessons)         | 39                  |
| Challenges                   | 429                 |
| Skills                       | 44                  |
| Spoken lines and words       | 395 recordings      |

**Nothing here has been reviewed by an early-years teacher or tried with a child, and no person has listened to
the recordings.** All three are required before any claim about what the game teaches. Each world's brief in
`prompt-series/` asks for more than is here; `docs/PROGRESS.md` says what, item by item.

## Principles the content must follow

These come from `prompt-series/00_MASTER_BRIEF.md` and are enforced where a machine can enforce them.

1. **Assume nothing.** The learner may not know letters, letter sounds, numerals, or how a game works.
2. **Show before asking.** Every lesson starts with at least one demonstration and at least one guided step. _(Schema:
   `plan.demo` and `plan.guided` must be non-empty.)_
3. **No reading needed, and no sound needed except where sound is the lesson.** Pictures and the guide's hand carry
   the task; captions are for the adult alongside and for screen readers; the voice adds to them. Reading Cove's
   activities are about sounds and cannot be done without them: each is marked `needsSound`, and shows a gate
   with one button when sound is off. Where two activities differ only in what is asked (more, fewer), each asks
   one thing throughout, so that its demonstration is enough.
4. **Teach on a miss.** A wrong answer takes that choice away and re-teaches; it is never a red cross, a lost life or a
   timer. _(Engine behaviour; there is no "wrong" colour in the design tokens.)_
5. **Assessment is separate from practice.** Only a first-try answer with no hint and no adult help, in an independent
   step, is independent evidence. _(Engine: `isIndependentSuccess`.)_
6. **Short.** An activity is 2–5 minutes. _(Schema: `estimatedMinutes` ≤ 5; test: ≥ 2.)_
7. **Correct.** The marked answer must be the only right one. _(Content lint.)_

## How content is written

One JSON file for each world: `src/content/packs/<world>.v<contentVersion>.json`. **A pack is never edited by
hand.** It is written by a generator, `scripts/content/<world>.mjs`, from short tables of what to ask, and
committed; `npm run content` writes them all, and a test fails if a pack file differs from what its generator
writes. The game never makes up a challenge while it runs: everything a child meets is in a file that can be
read, checked and reviewed.

```
ContentPack
  format, schemaVersion        file format (schemaVersion 1)
  id, world, contentVersion    bump contentVersion on every authored change; it is recorded on each attempt
  strings.en                   every line that is said or captioned, by key; each has a recording
  skills[]                     id, world, strand, title, objective (both for grown-ups), prerequisites[]
  lessons[]
    id, version, world, title, summary, skillIds[], estimatedMinutes, needsSound?
    plan
      demo[]                   challenge ids the guide demonstrates, in order
      guided[]                 challenge ids for supported practice, in order
      independent              { pool[], count, maxReprobes }
      closing[]?               one or two asked last of all (a question about the very start)
    successCriteria            { independentFirstTryCorrect }
    challenges[]               see below
```

A challenge is one of two kinds.

```
kind "choose-one"   a question with two to four choices; one tap answers
  prompt        { instruction, stimulus, glance?, cue?, ask? }
                  glance: shown for a look and then covered; ask: what is asked once it is covered;
                  cue: what stands in front of the cover ("what went with this?")
  choices[]     { id, stimulus, label }      label is the picture in words ("two snails")
  answer        the id of the one right choice
  misconceptions  { <distractor id>: tag }   why that distractor is tempting

kind "make"         a thing the child makes, judged by a rule (src/engine/tasks.ts)
  prompt        { instruction, stimulus? }
  task          give     an amount of things, one at a time, to as many friends
                order    cards to put first, next, last
                echo     things lit one after another, to tap in the same order
                select   some of the cards to pick out (after a look at them, where there is one)
                pairs    cards to turn two at a time until every pair is found
                program  a row of steps for a robot on a grid
                design   parts to change until a thing works, tested by a small model
  maxTries?     after this many wrong tries (three, unless said) the answer is shown and followed

both
  id            "<lesson-id>.<local-name>"
  skillId       one of the lesson's skills
  variant       a name for this presentation; independence needs success on more than one variant
  hints[]       the ladder, in order, ending with reveal: model, eliminate (a choice) or step (a part), reveal
  feedback      { correct, incorrect }       string keys
```

What a picture can be (`stimulus`): an amount of one of seven things; a picture from the kit (`src/art`); a
sound; a letter or two; a printed word; a sign that stands for the question; and a `scene`, which is a picture
only its own world knows how to draw (a robot's ground, a bench, a strip of a story, a map) and which that
world's rules check.

### ID conventions

| Thing      | Pattern                      | Example                         |
| ---------- | ---------------------------- | ------------------------------- |
| World      | fixed list                   | `number-garden`                 |
| Skill      | `strand.topic.skill`, dotted | `math.quantity.match-sets-to-3` |
| Lesson     | URL-safe slug, world prefix  | `ng-same-amount-01`             |
| Challenge  | `lesson-id.local-name`       | `ng-same-amount-01.two-apples`  |
| String key | dotted                       | `ng.same-amount.instruction`    |
| Card       | letters and digits only      | `egg2`                          |

IDs are permanent once content ships: the learner's record refers to them. To change what a lesson teaches, bump its
`version` (unfinished sittings of the old version are then not resumed; their answers stay in the record).

### What refuses a pack (`npm test`)

**The schema** (`src/engine/schema.ts`): shapes, ranges and ids.

**The lint** (`src/content/lint.ts`): references (plan to challenges, lesson to skills, strings), duplicates, the
prerequisite graph, plan arithmetic (`count` no more than the pool, a bar no higher than `count`, more than one
variant in the pool), hint ladders (never remove the answer, reveal last and only last), and for each kind of
task that its marked solution is one the rule accepts — a robot's row is run, a bench's design is tested.

**Its world's rules** (`src/content/rules/<world>.ts`): that the marked answer is the one and only right answer
for what that world asks, and that what is offered beside it is wrong for a reason someone chose. A world with
no rules is refused outright.

Every rule has a case in `tests/content/` that breaks a copy of the real pack to make it fire, and a test that
reads each rules file and fails if a rule has no such case.

### Adding or changing an activity: checklist

1. Change the tables in `scripts/content/<world>.mjs`; add or reuse a skill and list its prerequisites.
2. Plan it: at least one demonstration, at least one guided step, an independent pool larger than `count` with
   more than one variant.
3. Bump `contentVersion` (the file is named after it). `npm run content`.
4. Record the new lines (`scripts/voice/README.md`); reword any the recogniser hears differently.
5. `npm test`: the schema, the lint, the world's rules, "the pack is what its generator writes", "every line has a
   recording", and "playable to the end under arbitrary play".
6. Add the activity to its world in `src/game/worlds.ts`, with something to try together away from the screen.
7. Play it on a phone-sized screen with the sound off and without reading the captions.

## How evidence is reported

Statuses, in order: _not yet observed_ → _exploring_ → _guided_ → _practicing_ → _provisionally independent_ →
_consistently independent_.

| Status                    | Rule (defaults in `DEFAULT_EVIDENCE_POLICY`)                                              |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| not yet observed          | no response recorded — not a judgement                                                    |
| exploring                 | has responded; no correct first try without help                                          |
| guided                    | correct at the first try in guided steps; no independent success                          |
| practicing                | at least one independent success                                                          |
| provisionally independent | ≥ 3 independent successes, ≥ 2 variants, ≥ 75 % of the last 8 independent probes right    |
| consistently independent  | ≥ 5 independent successes, ≥ 2 variants, on ≥ 2 calendar days, ≥ 80 % of the last 8 right |

These numbers are **product heuristics**. They are not research-validated cut-offs, they do not measure ability or
development, and nothing in the game reports an "IQ", an age level or a comparison with other children. Phase 12
revisits them with spaced review and a wider set of simulated learners.

A grown-up sees the counts in words, for example: _"3 independent successes in 3 kinds of question on 1 day. 2 right
at the first try in practice with the guide."_

## Authored content

These tables are written from the pack files.

### Reading Cove — `reading-cove.v1.json` (contentVersion 1)

10 activities, 126 challenges, 10 skills, 31 spoken lines. Written by `scripts/content/reading-cove.mjs`.

**How it teaches.** Listening comes first: a sound, and what made it; a short run of sounds to play back. Then the
first sound of a word, drawn out by the voice ("sssun"), matched to another word that starts the same. Then a
letter: its drawn shape with two key words, and the question "which of these starts with this?". Then blending:
a word said slowly to be found among pictures, and last a printed word to be read and matched to its picture.

**What is deliberately not here.** No recording of a letter's sound on its own. A synthesiser adds a vowel to a
consonant said alone, and no machine check can say whether a single sound is right; a wrong model of a sound is
worse than none. Letters are taught through words until a person records or approves the sounds. No letter
names, no capitals, no rhyme, no syllables, no segmenting, no sentences.

**Counts, as the tests pin them:** 15 letters taught (s m a t, p i n o, f l c h, u e r); 25 different words
blended or read, each three letters spelt as it sounds; 14 of them given to read in print; 0 sentences. Nothing
to be read uses a letter that has not been taught (`tests/content/readingCoveRules.test.ts`). Every activity
here needs sound and says so.

| Activity        | Title                                | Challenges | A sitting                        | The child's part |
| --------------- | ------------------------------------ | ---------- | -------------------------------- | ---------------- |
| `rc-listen-01`  | What made that sound?                | 11         | 1 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-listen-02`  | Play it back                         | 11         | 1 shown, 2 guided, 4 of 8 alone  | repeat an order  |
| `rc-first-01`   | Which one starts the same? (s, m, f) | 11         | 1 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-first-02`   | Which one starts the same? (n, l, r) | 11         | 1 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-letters-01` | Letters and their sounds: s, m, a, t | 14         | 4 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-letters-02` | Letters and their sounds: p, i, n, o | 14         | 4 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-letters-03` | Letters and their sounds: f, l, c, h | 14         | 4 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-letters-04` | Letters and their sounds: u, e, r    | 13         | 3 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-blend-01`   | The slow word                        | 13         | 1 shown, 2 guided, 4 of 10 alone | a choice         |
| `rc-blend-02`   | Read the word                        | 14         | 1 shown, 2 guided, 4 of 11 alone | a choice         |

| Skill                                     | For grown-ups                            | What it means                                                                                                                                                         |
| ----------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `phonics.listening.match-sound-to-source` | Tell sounds apart                        | Hears a sound and finds what made it, out of two or three things that make different sounds.                                                                          |
| `phonics.listening.repeat-sound-pattern`  | Repeat a pattern of sounds               | Hears two or three sounds one after another and plays them back in the same order.                                                                                    |
| `phonics.awareness.first-sound-s-m-f`     | Hear the first sound of a word: s, m, f  | Hears that two spoken words start with the same sound, for words that start with s, m or f. Done by ear, with pictures; no letters are shown.                         |
| `phonics.awareness.first-sound-n-l-r`     | Hear the first sound of a word: n, l, r  | Hears that two spoken words start with the same sound, for words that start with n, l or r.                                                                           |
| `phonics.letters.s-m-a-t`                 | Link letters to their sounds: s, m, a, t | Shown the letter s or m or a or t with no word to help, finds a picture whose word starts with its sound; and shown a picture, finds the letter its word starts with. |
| `phonics.letters.p-i-n-o`                 | Link letters to their sounds: p, i, n, o | Shown the letter p or i or n or o with no word to help, finds a picture whose word starts with its sound; and shown a picture, finds the letter its word starts with. |
| `phonics.letters.f-l-c-h`                 | Link letters to their sounds: f, l, c, h | Shown the letter f or l or c or h with no word to help, finds a picture whose word starts with its sound; and shown a picture, finds the letter its word starts with. |
| `phonics.letters.u-e-r`                   | Link letters to their sounds: u, e, r    | Shown the letter u or e or r with no word to help, finds a picture whose word starts with its sound; and shown a picture, finds the letter its word starts with.      |
| `phonics.blending.hear-slow-word`         | Blend a slow word by ear                 | Hears a short word said slowly, sound running into sound, and knows which word it is, told apart from a word one sound different.                                     |
| `phonics.decoding.read-short-word`        | Read a short word                        | Reads a three-letter word made of letters already taught, with nothing said aloud, and finds its picture among words that are nearly the same.                        |

### Number Garden — `number-garden.v2.json` (contentVersion 2)

7 activities, 77 challenges, 7 skills, 29 spoken lines. Written by `scripts/content/number-garden.mjs`.

**How it teaches.** Amounts before numerals: no numeral appears anywhere. The things in a group are counted aloud by
the voice with a climbing note for each. A group to be seen at a glance is uncovered and covered again, so that it
cannot be counted by pointing. Giving "one for each" is done one thing at a time and handed in; a wrong amount is
counted back, never just marked. More, fewer and equal each have an activity of their own, so that the pictures
alone say what is asked.

**What the rules check** (`src/content/rules/numberGarden.ts`): one choice has the amount asked for and it is the one
marked; no two choices show the same amount; the answer is never simply the same picture; bigger things are never
the larger amount by default, so size is not a clue.

| Activity            | Title                    | Challenges | A sitting                        | The child's part |
| ------------------- | ------------------------ | ---------- | -------------------------------- | ---------------- |
| `ng-same-amount-01` | Same amount, up to three | 8          | 1 shown, 2 guided, 3 of 5 alone  | a choice         |
| `ng-glance-01`      | How many, at a glance    | 11         | 1 shown, 2 guided, 4 of 8 alone  | a choice         |
| `ng-give-01`        | One for each, up to five | 10         | 1 shown, 2 guided, 3 of 7 alone  | give an amount   |
| `ng-give-02`        | One for each, up to ten  | 11         | 1 shown, 2 guided, 3 of 8 alone  | give an amount   |
| `ng-more-01`        | Which has more?          | 13         | 1 shown, 2 guided, 4 of 10 alone | a choice         |
| `ng-fewer-01`       | Which has fewer?         | 13         | 1 shown, 2 guided, 4 of 10 alone | a choice         |
| `ng-equal-01`       | Two that are equal       | 11         | 1 shown, 2 guided, 3 of 8 alone  | pick out         |

| Skill                           | For grown-ups                  | What it means                                                                                                                                                                |
| ------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `math.quantity.match-sets-to-3` | Match small groups by amount   | Sees that two groups of up to three things have the same amount, even when the things and how they are laid out are different. No numerals and no counting words are needed. |
| `math.quantity.subitize-to-4`   | See small amounts at a glance  | Sees how many are in a group of up to four when it is shown only for a moment, without counting one by one, and matches it to a group of the same amount.                    |
| `math.counting.give-to-5`       | Give one for each, up to five  | Gives out exactly as many things as there are friends, up to five, one for each, and stops there without places to fill.                                                     |
| `math.counting.give-to-10`      | Give one for each, up to ten   | Gives out exactly as many things as there are friends, from six to ten, keeping count of how many have been given.                                                           |
| `math.comparison.more-to-6`     | Find which group has more      | Picks the group with more out of two or three groups of up to six, including when the smaller group is made of bigger things.                                                |
| `math.comparison.fewer-to-6`    | Find which group has fewer     | Picks the group with fewer out of two or three groups of up to six, including when the larger group is made of smaller things.                                               |
| `math.comparison.equal-to-6`    | Find two groups that are equal | Out of three or four groups of up to six, finds the two that have the same amount, whatever they are made of and however they are laid out.                                  |

### Robot Ridge — `robot-ridge.v1.json` (contentVersion 1)

4 activities, 43 challenges, 4 skills, 18 spoken lines. Written by `scripts/content/robot-ridge.mjs`.

**How it teaches.** A robot, a star, and arrows: forward, turn left, turn right. First each tap is carried out at
once. Then a row of steps is planned and run. Then a short row is done over, two to four times. Then a row with
one wrong step is run, seen to go wrong, and mended. A bump costs nothing; a run that does not arrive stays where
it stopped; nothing is timed.

**What the rules check** (`src/content/rules/robotRidge.ts`): every puzzle is solved by the engine's own solver
when the pack is built; a puzzle about doing it again cannot be done in the row without doing it again; a row to
mend is one step away from working; no grid is taller than three rows or longer than five places, so that it
fits a small phone.

| Activity       | Title                         | Challenges | A sitting                        | The child's part |
| -------------- | ----------------------------- | ---------- | -------------------------------- | ---------------- |
| `rr-move-01`   | One arrow, one move           | 10         | 1 shown, 2 guided, 3 of 7 alone  | a row of steps   |
| `rr-steps-01`  | Two and three steps in order  | 14         | 1 shown, 2 guided, 3 of 11 alone | a row of steps   |
| `rr-repeat-01` | Do it again                   | 10         | 1 shown, 2 guided, 3 of 7 alone  | a row of steps   |
| `rr-mend-01`   | Find the step that went wrong | 9          | 1 shown, 2 guided, 3 of 6 alone  | a row of steps   |

| Skill                        | For grown-ups              | What it means                                                                                                                                                             |
| ---------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coding.commands.one-move`   | Know what each arrow does  | Takes the robot to a goal one command at a time: knows that forward moves it one square the way it is facing, and that a turn changes the way it faces without moving it. |
| `coding.sequence.plan-short` | Plan two or three steps    | Puts two or three commands in order before any of them is carried out, so that the robot reaches the goal when the program is run.                                        |
| `coding.repeat.do-again`     | Make steps happen again    | Uses "do it again" so that a short program takes the robot a long way, on journeys that are too long for the program without it.                                          |
| `coding.debug.mend-one-step` | Find and mend a wrong step | Watches a program go wrong, finds the one step that sends the robot the wrong way, and changes that step so that the robot arrives.                                       |

### Memory Forest — `memory-forest.v1.json` (contentVersion 1)

6 activities, 63 challenges, 7 skills, 40 spoken lines. Written by `scripts/content/memory-forest.mjs`.

**How it teaches.** Pairs, first face up to learn the game and then face down. Things looked at and then covered
by a leaf, and a question about one of them. An order to repeat. And three ways to remember, each shown and
then used: grouping, a silly picture of who has what, and places along a path.

**What is kept apart.** Knowing a thing again, repeating an order, recalling from a cue and recalling without one
are seven separate skills, and nothing adds them up or calls the result memory. What is covered is not in the
page at all, and the cards to answer with are blank while things are on show; asking for another look is help
and is recorded as help.

| Activity       | Title                   | Challenges | A sitting                                     | The child's part |
| -------------- | ----------------------- | ---------- | --------------------------------------------- | ---------------- |
| `mf-pairs-01`  | Find the pairs          | 9          | 1 shown, 2 guided, 3 of 6 alone               | find pairs       |
| `mf-hidden-01` | Which one was there?    | 12         | 1 shown, 2 guided, 4 of 8 alone, 1 at the end | a choice         |
| `mf-order-01`  | The same order          | 11         | 1 shown, 2 guided, 4 of 8 alone               | repeat an order  |
| `mf-groups-01` | Things that go together | 9          | 1 shown, 2 guided, 3 of 6 alone               | pick out         |
| `mf-story-01`  | Who had what?           | 11         | 1 shown, 2 guided, 4 of 8 alone               | a choice         |
| `mf-places-01` | What was where?         | 11         | 1 shown, 2 guided, 4 of 8 alone               | a choice         |

| Skill                               | For grown-ups                        | What it means                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `memory.recognition.find-pairs`     | Find pairs among cards face down     | Finds every pair among six or eight cards lying face down, in no more turns than remembering where things are would need.                                                        |
| `memory.recognition.what-was-there` | Know again what was just hidden      | After looking at two to four things that are then covered, picks out one that was there from pictures of things that were not.                                                   |
| `memory.recognition.after-a-while`  | Know again what was seen a while ago | At the end of an activity, picks out a thing shown at its very start and not seen since. One question, kept apart from the others: a longer wait is a different thing to manage. |
| `memory.serial.repeat-order`        | Remember an order                    | Watches three or four things light up one after another and taps them in the same order.                                                                                         |
| `memory.strategy.grouping`          | Remember by grouping                 | Looks at four things that fall into two kinds, and after they are put away picks all four out from among others, with nothing to prompt them.                                    |
| `memory.strategy.linking`           | Remember by linking two things       | Looks at two or three pairs — who had what — and, shown one of them, says what went with it.                                                                                     |
| `memory.strategy.places`            | Remember by places                   | Looks at things left at two or three places and, shown one place, says what was there.                                                                                           |

### Inventor Island — `inventor-island.v1.json` (contentVersion 1)

4 activities, 52 challenges, 8 skills, 48 spoken lines. Written by `scripts/content/inventor-island.mjs`.

**How it teaches.** Each activity is two things. A guess: something is set up — a goat and a plank, a ball and
a ramp — and the child says what will happen before it is tested in front of them; a guess that did not come
true is kept beside what did happen, not rubbed out. And a mend: a thing that does not work is on a bench with
its parts to change, and each change is tested.

**What the models are.** Four small, exact, made-up models (`src/engine/models.ts`): a plank holds or sags by its
thickness, its posts and who crosses; a ball stops by the height of the ramp and the roughness of the ground;
a beam balances by blocks and how far out they are; a thing floats by what it is made of and, for a boat, by its
size and load. They behave the same way every time and they are not physics.

| Activity        | Title             | Challenges | A sitting                        | The child's part          |
| --------------- | ----------------- | ---------- | -------------------------------- | ------------------------- |
| `ii-bridge-01`  | Bridges that hold | 12         | 2 shown, 2 guided, 3 of 8 alone  | a choice, mend on a bench |
| `ii-ramp-01`    | Ramps and rolling | 12         | 2 shown, 2 guided, 3 of 8 alone  | a choice, mend on a bench |
| `ii-balance-01` | Balancing         | 12         | 2 shown, 2 guided, 3 of 8 alone  | a choice, mend on a bench |
| `ii-float-01`   | Float or sink     | 16         | 2 shown, 2 guided, 4 of 12 alone | a choice, mend on a bench |

| Skill                         | For grown-ups                            | What it means                                                                                                                                                      |
| ----------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `engineering.bridge.predict`  | Guess whether a bridge will hold         | Looks at a plank bridge — how wide the gap, how thick the plank, how many posts, who is crossing — and says whether it will hold before it is tested.              |
| `engineering.bridge.build`    | Mend a bridge that sags                  | Changes a bridge that sags, by a thicker plank or by posts, until it holds, testing after each change.                                                             |
| `engineering.ramp.predict`    | Guess where a rolling ball will stop     | Looks at how high a ramp is and whether the ground is rough or smooth, and says whether the ball will stop short of the star, on it or past it.                    |
| `engineering.ramp.build`      | Set a ramp so the ball stops on the star | Changes the height of a ramp and the ground it rolls onto until the ball stops where it is wanted, testing after each change.                                      |
| `engineering.balance.predict` | Guess which way a beam will tip          | Looks at how many blocks are on each side of a beam and how far out they are, and says which side will go down or that it will balance.                            |
| `engineering.balance.build`   | Make a beam balance                      | Places blocks on one side of a beam to balance the other, using both how many and how far out.                                                                     |
| `engineering.float.predict`   | Guess what floats and what sinks         | Says whether a thing will float or sink before it is dropped in water, going by what it is made of and not by how big it is; and whether a loaded boat will float. |
| `engineering.float.build`     | Choose a boat that carries the load      | Carries stones across a pond by choosing a boat big enough and loading it with all of them and no more than it can bear.                                           |

### Explorer Harbor — `explorer-harbor.v1.json` (contentVersion 1)

8 activities, 68 challenges, 8 skills, 71 spoken lines. Written by `scripts/content/explorer-harbor.mjs`.

**How it teaches.** Eight little stories, three pictures each, put in order and then told back by the voice with
each picture lifted in turn. The same stories with the last picture missing. Eight changes with a cause — a
snowman and the sun, a tower and a ball — asked both ways: what did it, and what will come of it. And a map of
made-up islands to answer on by tapping the map itself: the flag that stands on water, the flag on land, the
island nearest the boat, the island farthest.

**What the rules check** (`src/content/rules/explorerHarbor.ts`): a story's order is the storybook's; nothing
offered beside an ending or a cause could be taken for it (the storybook lists, for each, what must never be
offered); every map is worked out again from its numbers — a flag counts as on land only well inside a shore
and as on water only well clear of every shore, an island is the nearest only if it is no more than 62 % as far
as the next, and places are far enough apart to press.

| Activity       | Title                       | Challenges | A sitting                       | The child's part |
| -------------- | --------------------------- | ---------- | ------------------------------- | ---------------- |
| `eh-story-01`  | Put the story in order      | 8          | 1 shown, 2 guided, 3 of 5 alone | put in order     |
| `eh-ending-01` | How does it end?            | 8          | 1 shown, 2 guided, 3 of 5 alone | a choice         |
| `eh-why-01`    | What made it happen?        | 8          | 1 shown, 2 guided, 3 of 5 alone | a choice         |
| `eh-next-01`   | What happens next?          | 8          | 1 shown, 2 guided, 3 of 5 alone | a choice         |
| `eh-water-01`  | Which flag is on the water? | 9          | 1 shown, 2 guided, 4 of 6 alone | a choice         |
| `eh-land-01`   | Which flag is on the land?  | 9          | 1 shown, 2 guided, 4 of 6 alone | a choice         |
| `eh-near-01`   | Which island is nearest?    | 9          | 1 shown, 2 guided, 4 of 6 alone | a choice         |
| `eh-far-01`    | Which island is farthest?   | 9          | 1 shown, 2 guided, 4 of 6 alone | a choice         |

| Skill                          | For grown-ups           | What it means                                                                                                                |
| ------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `story.sequence.order-three`   | Put a story in order    | Puts three pictures of something that happens into the order it happens in: beginning, middle and end.                       |
| `story.sequence.choose-ending` | Say how a story ends    | Shown the beginning and the middle of a short story, picks the picture it ends with from among the endings of other stories. |
| `story.cause.find-cause`       | Say what made it happen | Shown a thing before and after something happened to it, picks what did it from three things, two of which could not have.   |
| `story.cause.predict`          | Say what happens next   | Shown a thing and what is about to happen to it, picks how it will turn out from three pictures.                             |
| `world.map.water`              | Find water on a map     | On a simple map of sea and islands, picks the one flag of two or three that stands on water.                                 |
| `world.map.land`               | Find land on a map      | On a simple map of sea and islands, picks the one flag of two or three that stands on land.                                  |
| `world.space.nearest`          | Find the nearest place  | On a map with a boat and three islands, picks the island nearest to the boat.                                                |
| `world.space.farthest`         | Find the farthest place | On a map with a boat and three islands, picks the island farthest from the boat.                                             |

### The first activity as it is played (Phase 03)

This was the first complete activity, and it is the one the older browser tests play. Its eight challenges are
still written by hand (`scripts/content/authored/number-garden.same-amount.json`) and carried into the pack by the
generator. What follows is what is in the build, by id; the voice now says each line as well.

| Id                                 | What it is                                                        |
| ---------------------------------- | ----------------------------------------------------------------- |
| `number-garden` (contentVersion 2) | the pack: `src/content/packs/number-garden.v2.json`               |
| `math.quantity.match-sets-to-3`    | the skill                                                         |
| `ng-same-amount-01` (version 1)    | the lesson; address `/world/number-garden/play/ng-same-amount-01` |
| `ng-same-amount-01.demo-two`       | step 1, the demonstration: 2 snails ↔ **2 leaves**, 1 leaf        |
| `ng-same-amount-01.guided-one`     | step 2, guided: 1 apple ↔ **1 acorn**, 3 acorns                   |
| `ng-same-amount-01.guided-three`   | step 3, guided: 3 snails ↔ 2 leaves, **3 leaves**                 |
| `ng-same-amount-01.two-apples`     | independent pool: 2 apples ↔ 3, 1, **2** acorns                   |
| `ng-same-amount-01.three-leaves`   | independent pool: 3 leaves ↔ **3**, 2, 1 snails                   |
| `ng-same-amount-01.one-acorn`      | independent pool: 1 acorn ↔ 2, **1**, 3 apples                    |
| `ng-same-amount-01.two-snails`     | independent pool: 2 snails ↔ 1, **2**, 3 apples                   |
| `ng-same-amount-01.three-acorns`   | independent pool: 3 acorns ↔ 2, **3**, 1 leaves                   |

A sitting is six steps: the demonstration, the two guided steps in that order, and three of the five independent
challenges, drawn and ordered by the sitting's seed. If an independent step is answered with help or after a wrong
try, one more independent step of a different kind is added at the end (at most one), so there is still a chance
to show the skill unaided: a sitting is then seven steps.

**What each stage looks and sounds like** (the "script" is `src/game/lesson/script.ts`; nothing in it decides
anything, it only shows what the engine has said):

| Stage                    | What the child meets                                                                                                                                                                                                 | What is recorded                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| I do — the demonstration | Glim counts the group, thing by thing, each with a climbing note; then points out its match and counts that, with the same notes; then the two are lit together. Nothing can be answered; "My turn" moves on.        | Nothing. A demonstration is never an attempt.                                             |
| We do — two guided steps | The question is put (the group is offered, then each choice in turn), and the group is counted with the child. Two choices.                                                                                          | An attempt, stage `guided`. Never counts as independent.                                  |
| You do — on their own    | The question is put, and that is all. Three choices. Help is there to be asked for.                                                                                                                                  | An attempt, stage `independent`. Independent only if right at the first try with no help. |
| A right answer           | The choice is ticked and lit; the group is counted, then the answer, with the same notes; both are lit. Glim is glad. The way on appears.                                                                            | —                                                                                         |
| A wrong answer           | The choice stays where it is, with a dashed edge, while the group and then that choice are counted: a different number of notes. Then it is set aside. Glim tilts its head. With one choice left, that one is shown. | The attempt, and which misunderstanding the choice stands for.                            |
| Help, a step at a time   | 1: the group is counted again. 2: one wrong group is set aside. 3: the right group is shown. The child still taps it.                                                                                                | The level of help, on the next attempt.                                                   |
| "Show me again" (Glim)   | Whatever was last shown is shown again from the start.                                                                                                                                                               | Nothing. It is not help.                                                                  |
| The end                  | The world's island, Glim celebrating, a flower for each thing done; "Again" and the way home. For the grown-up: how many independent steps were right at the first try.                                              | The sitting is marked complete.                                                           |

No step is timed, nothing is lost by a wrong answer, and there is nothing to read: words on the screen are for the
grown-up alongside and for a screen reader.

**Why going round again, leaving, or refreshing cannot make the record say more than it should** (replay-safe
progression):

- Attempts are only ever added, each under the id `<sitting>:<number>`; a second tap, a second tab or a retried
  save cannot add the same attempt twice (three guards: the runner, the engine's key for "this step, this try", and
  the store's insert-only write).
- A sitting in progress is resumed exactly — the step, the order of the choices, the choices already set aside, the
  help already used — by `LessonRunner.start`, as long as the lesson and content versions are the ones it was
  begun with. A sitting begun on an older version is closed; its attempts stay in the record.
- A finished sitting is never resumed. "Again", and coming back after finishing, begin a new sitting with a new
  seed, so the independent steps are drawn and ordered afresh.
- Playing the same sitting-sized activity ten times in a day does not make a child "independent": the evidence
  rules count one success per challenge per day, need more than one kind of question, and need more than one day
  for the top status (see _How evidence is reported_, above).
- The demonstration, "show me again", pausing, leaving and refreshing record nothing at all.

All of this is exercised in a browser by `e2e/journey.spec.ts` and `e2e/lesson.spec.ts`, and at the level of the
engine and the runner by `tests/engine/`, `tests/game/lessonRunner.test.ts` and `tests/game/lessonScript.test.ts`.

## What each world does not have yet

From the briefs in `prompt-series/`; `docs/PROGRESS.md` has each brief set against what exists.

| World           | Not built                                                                                                              | Brief |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- | ----- |
| Reading Cove    | rhyme and syllables; a sound on its own; segmenting; digraphs; sentences; words not met before; capitals; letter names | 05    |
| Number Garden   | a number line; numerals; zero; number bonds; adding and taking away                                                    | 06    |
| Robot Ridge     | plans of four to ten steps; conditions ("if the bridge is up")                                                         | 07    |
| Memory Forest   | a choice of strategy; recall in a later sitting; more than four things                                                 | 08    |
| Inventor Island | a wind shelter; a record that the away-from-screen challenge was done; a portfolio card                                | 09    |
| Explorer Harbor | making up a story; stories that branch; a globe, continents, countries, flags, people and places                       | 10    |

Open questions: who reviews the phonics content and the audio; whether a person should record the voice; how
prerequisites that cross worlds are shown on the map (nothing is locked, and Glim simply points at the next
thing not yet finished).
