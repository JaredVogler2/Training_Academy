# Curriculum

**Status: seven worlds, a first pass through each.** Every activity the six islands' pages promised is authored
and playable, and so are the Music Lab's six. Counts in this document are of real content in the repository,
and the tests pin the ones quoted most. (All of it is live but Inventor Island's fifth activity, a shelter
from the wind, which is on a pull request that is not merged. The help for a first visit, described at the end
of this document under _Where a child begins_, went live on 2026-11-26.)

|                              | Authored and tested |
| ---------------------------- | ------------------- |
| Worlds with playable content | 7 of 7              |
| Activities (lessons)         | 68                  |
| Challenges                   | 788                 |
| Skills                       | 78                  |
| Spoken lines and words       | 604 recordings      |

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
   activities, and three of the Music Lab's, are about sounds and cannot be done without them: each is marked
   `needsSound`, and shows a gate with one button when sound is off. Where two activities differ only in what is asked (more, fewer), each asks
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
                beat     a slow beat to tap along with; most of the beats met is keeping it
                tune     a tune to make up with a shape (up, down, a hill, twice, home); any such tune is right
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
only its own world knows how to draw (a robot's ground, a bench, a strip of a story, a map, a chime bar, a bird
with a tune to sing) and which that world's rules check.

### ID conventions

| Thing      | Pattern                      | Example                         |
| ---------- | ---------------------------- | ------------------------------- |
| World      | fixed list                   | `number-garden`                 |
| Skill      | `strand.topic.skill`, dotted | `math.quantity.match-sets-to-3` |
| Lesson     | URL-safe slug, world prefix  | `ng-same-amount-01`             |
| Challenge  | `lesson-id.local-name`       | `ng-same-amount-01.two-apples`  |
| String key | dotted                       | `ng.same-amount.instruction`    |
| Card       | letters and digits only      | `egg2`                          |

IDs are permanent once content ships: the learner's record refers to them. To change anything in a lesson — a
challenge, a choice, the plan, a word of its summary — bump its `version`: an unfinished sitting is taken up
again only in the version of the lesson it was begun in (its answers stay in the record either way). This is
enforced. Every lesson is written down in `src/content/lessons.lock.json` by id and version, with a mark made
from the whole of it, and `npm run content` refuses a lesson that differs from its mark. Adding lessons to a
world changes the world's `contentVersion` and nobody's place: a place is kept by the lesson's version, not the
world's.

### What refuses a pack (`npm test`)

**The schema** (`src/engine/schema.ts`): shapes, ranges and ids.

**The lint** (`src/content/lint.ts`): references (plan to challenges, lesson to skills, strings), duplicates, the
prerequisite graph, plan arithmetic (`count` no more than the pool, a bar no higher than `count`, more than one
variant in the pool), hint ladders (never remove the answer, reveal last and only last), and for each kind of
task that its marked solution is one the rule accepts — a robot's row is run, a bench's design is tested, a
tune is checked for its shape, and a beat must ask for more than half its beats.

**Its world's rules** (`src/content/rules/<world>.ts`): that the marked answer is the one and only right answer
for what that world asks, and that what is offered beside it is wrong for a reason someone chose. A world with
no rules is refused outright.

Every rule has a case in `tests/content/` that breaks a copy of the real pack to make it fire, and a test that
reads each rules file and fails if a rule has no such case.

### Adding or changing an activity: checklist

1. Change the tables in `scripts/content/<world>.mjs`; add or reuse a skill and list its prerequisites.
2. Plan it: at least one demonstration, at least one guided step, an independent pool larger than `count` with
   more than one variant.
3. Bump `contentVersion` (the file is named after it), and the `version` of any lesson that already existed
   and has changed. `npm run content`: it says so if a lesson changed and its version did not.
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

### Reading Cove — `reading-cove.v2.json` (contentVersion 2)

16 activities, 201 challenges, 16 skills, 56 spoken lines. Written by `scripts/content/reading-cove.mjs`.

**How it teaches.** Listening comes first: a sound, and what made it; a short run of sounds to play back. Then,
still by ear and with pictures only, the parts of a word that can be heard before any letter is met: whether two
words rhyme, how many beats a word is clapped in, and the first sound of a word, drawn out by the voice ("sssun"),
matched to another word that starts the same. Then a letter: its drawn shape with two key words, and the question
"which of these starts with this?". Then blending: a word said slowly to be found among pictures, and a printed
word to be read and matched to its picture. Then the other way about: a word that is heard, and its three letters
to put in order. Then the first three pairs of letters that write one sound, and words with those in them. And
last a sentence of five words, read and matched to the picture it tells of.

**What a child is helped with, and what is left to the child.** In each of the six later activities the two steps
with support and the steps alone differ in one thing, and it is the thing the activity is about:

| Activity          | With support                                                                 | Alone                                         |
| ----------------- | ---------------------------------------------------------------------------- | --------------------------------------------- |
| Which one rhymes? | the word is said again before each choice, so the two are heard side by side | the word once, then each choice once          |
| Clap the word     | the word is said in its beats, a clap and a mark for each                    | the word is only said; the clapping is theirs |
| Build the word    | the word is said slowly, and each place lights as its sound begins           | the word is said once, plainly                |
| Two letters       | the pair is given a word that starts with its sound                          | the pair is shown with no word                |
| Read the word     | the word is said slowly, a finger under each tile                            | nothing is said                               |
| Read the sentence | it is read aloud, a finger under each word                                   | nothing is said, and no finger shows the way  |

A wrong answer is answered by the thing itself: the word that was picked and the word asked about are said one
after the other (they do not end the same); the card that was picked is clapped and then the word is (not the same
number); the letters that were in their places stay there and the word is said slowly. A sentence that was read
wrongly is not read out: that is asked for, as help.

**Where a sound or a beat begins** is not guessed. A word said slowly, a word in its beats and a sentence read
aloud each come with marks — when each sound, beat or word begins — which the voice tool writes down from what the
synthesiser says of its own speech (`src/voice/marks/`, `scripts/voice/make_voice.py`). The finger, the lit place
and the clap follow those marks. Nobody has checked by ear that they fall where they should.

**What is deliberately not here.** No recording of a letter's sound on its own. A synthesiser adds a vowel to a
consonant said alone, and no machine check can say whether a single sound is right; a wrong model of a sound is
worse than none. Letters are taught through words until a person records or approves the sounds. No letter
names, no capitals. No word that has not been met as a picture, and no made-up word: the brief's last step, a
check that a child can read a word they have never seen (P6), is not built, so nothing here shows that. Nothing a
child says is listened to: reading aloud is not scored. Sentences are all of one shape, "a … on a …" or "a … in a
…": every word of them can be sounded out from letters that are taught, and every one can be drawn; a sentence
with a verb in it ("a cat sat") would need drawings of doing, which there are none of. Only three pairs of
letters, and no word with two consonants together ("ship", not "shrimp").

**Counts, as the tests pin them:** 15 letters taught (s m a t, p i n o, f l c h, u e r) and 3 pairs (sh ch th);
33 words in the lexicon spelt as they sound, 7 of them with a pair; 32 different words blended, read or built; 21
of them given to read in print; 13 built from their letters; 13 words asked about for a rhyme; 13 words clapped
(4 of one beat, 5 of two, 4 of three); 12 different sentences, answered from 29 different pictures. Nothing to be
read uses a letter that has not been taught, the little words included (`tests/content/readingCoveRules.test.ts`).
Every activity here needs sound and says so.

**The ten activities that were live before these did not change**, and could not have: each lesson is held to what
was written down for it (`src/content/lessons.lock.json`). Their clips for words said slowly were made again, so
that every such clip has its marks; a finger now steps from tile to tile under a word that is read out, where it
used to run along under it at one speed whatever the word.

| Activity          | Title                                | Challenges | A sitting                        | The child's part |
| ----------------- | ------------------------------------ | ---------- | -------------------------------- | ---------------- |
| `rc-listen-01`    | What made that sound?                | 11         | 1 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-listen-02`    | Play it back                         | 11         | 1 shown, 2 guided, 4 of 8 alone  | repeat an order  |
| `rc-rhyme-01`     | Which one rhymes?                    | 13         | 1 shown, 2 guided, 4 of 10 alone | a choice         |
| `rc-syllables-01` | Clap the word                        | 13         | 1 shown, 2 guided, 4 of 10 alone | a choice         |
| `rc-first-01`     | Which one starts the same? (s, m, f) | 11         | 1 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-first-02`     | Which one starts the same? (n, l, r) | 11         | 1 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-letters-01`   | Letters and their sounds: s, m, a, t | 14         | 4 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-letters-02`   | Letters and their sounds: p, i, n, o | 14         | 4 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-letters-03`   | Letters and their sounds: f, l, c, h | 14         | 4 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-letters-04`   | Letters and their sounds: u, e, r    | 13         | 3 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-blend-01`     | The slow word                        | 13         | 1 shown, 2 guided, 4 of 10 alone | a choice         |
| `rc-blend-02`     | Read the word                        | 14         | 1 shown, 2 guided, 4 of 11 alone | a choice         |
| `rc-spell-01`     | Build the word                       | 13         | 1 shown, 2 guided, 4 of 10 alone | put in order     |
| `rc-letters-05`   | Two letters, one sound: sh, ch, th   | 13         | 3 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-blend-03`     | Read the word: sh, ch, th            | 11         | 1 shown, 2 guided, 4 of 8 alone  | a choice         |
| `rc-sentences-01` | Read the sentence                    | 12         | 1 shown, 2 guided, 4 of 9 alone  | a choice         |

**Set against the brief** (`prompt-series/05_PHONICS_ADVENTURE.md`):

| The brief's step                                                 | Here                                                                                                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0 sounds around us, patterns of sound, rhyme, syllables, by ear | `rc-listen-01`, `rc-listen-02`, `rc-rhyme-01`, `rc-syllables-01`, `rc-first-01`, `rc-first-02`                                                        |
| P1 hearing single sounds                                         | first sounds only, and only inside words: no sound is played on its own                                                                               |
| P2 a letter's shape and its sound                                | `rc-letters-01` to `-04`: fifteen letters, lower case, by key words                                                                                   |
| P3 blending, by ear and then in print                            | `rc-blend-01`, `rc-blend-02`                                                                                                                          |
| P4 segmenting: first, middle and last sound; tiles put in order  | `rc-spell-01`: three tiles, three places; each place is a sound. No counters apart from the places, and no question of its own about where a sound is |
| P5 short words, then pairs of letters, then a sentence           | `rc-letters-05`, `rc-blend-03`, `rc-sentences-01`: three pairs, seven words with one, twelve sentences                                                |
| P6 a word never met before; a made-up word now and then          | not built                                                                                                                                             |

| Skill                                     | For grown-ups                             | What it means                                                                                                                                                                              |
| ----------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `phonics.listening.match-sound-to-source` | Tell sounds apart                         | Hears a sound and finds what made it, out of two or three things that make different sounds.                                                                                               |
| `phonics.listening.repeat-sound-pattern`  | Repeat a pattern of sounds                | Hears two or three sounds one after another and plays them back in the same order.                                                                                                         |
| `phonics.awareness.first-sound-s-m-f`     | Hear the first sound of a word: s, m, f   | Hears that two spoken words start with the same sound, for words that start with s, m or f. Done by ear, with pictures; no letters are shown.                                              |
| `phonics.awareness.first-sound-n-l-r`     | Hear the first sound of a word: n, l, r   | Hears that two spoken words start with the same sound, for words that start with n, l or r.                                                                                                |
| `phonics.letters.s-m-a-t`                 | Link letters to their sounds: s, m, a, t  | Shown the letter s or m or a or t with no word to help, finds a picture whose word starts with its sound; and shown a picture, finds the letter its word starts with.                      |
| `phonics.letters.p-i-n-o`                 | Link letters to their sounds: p, i, n, o  | Shown the letter p or i or n or o with no word to help, finds a picture whose word starts with its sound; and shown a picture, finds the letter its word starts with.                      |
| `phonics.letters.f-l-c-h`                 | Link letters to their sounds: f, l, c, h  | Shown the letter f or l or c or h with no word to help, finds a picture whose word starts with its sound; and shown a picture, finds the letter its word starts with.                      |
| `phonics.letters.u-e-r`                   | Link letters to their sounds: u, e, r     | Shown the letter u or e or r with no word to help, finds a picture whose word starts with its sound; and shown a picture, finds the letter its word starts with.                           |
| `phonics.blending.hear-slow-word`         | Blend a slow word by ear                  | Hears a short word said slowly, sound running into sound, and knows which word it is, told apart from a word one sound different.                                                          |
| `phonics.decoding.read-short-word`        | Read a short word                         | Reads a three-letter word made of letters already taught, with nothing said aloud, and finds its picture among words that are nearly the same.                                             |
| `phonics.awareness.rhyme`                 | Hear that two words rhyme                 | Hears a word and finds the one that rhymes with it, told apart from a word that starts the same and a word that only ends with the same sound. Done by ear, with pictures.                 |
| `phonics.awareness.syllables`             | Clap the beats of a word                  | Hears a word of one, two or three beats said plainly, and says how many beats it has by choosing as many claps.                                                                            |
| `phonics.segmenting.build-short-word`     | Build a short word from its sounds        | Hears a three-sound word said plainly and puts its three letters in order: the first sound, the middle one, the last.                                                                      |
| `phonics.letters.sh-ch-th`                | Link two letters to one sound: sh, ch, th | Shown sh or ch or th with no word to help, finds a picture whose word starts with its sound, and shown a picture, finds the pair its word starts with, told apart from the single letters. |
| `phonics.decoding.read-word-sh-ch-th`     | Read a short word with sh, ch or th       | Reads a word of three sounds, one of them written with two letters, with nothing said aloud, and finds its picture among words that are nearly the same.                                   |
| `phonics.decoding.read-short-sentence`    | Read a short sentence                     | Reads five short words in a row with nothing said aloud, and finds the picture they tell of among pictures that differ by one word.                                                        |

### Number Garden — `number-garden.v3.json` (contentVersion 3)

18 activities, 219 challenges, 18 skills, 66 spoken lines. Written by `scripts/content/number-garden.mjs`, with
the eleven later activities in `scripts/content/number-garden-numbers.mjs`.

**How it teaches.** Amounts before numerals. In the first seven activities no numeral appears anywhere. The
things in a group are counted with a climbing note for each. A group to be seen at a glance is uncovered and
covered again, so that it cannot be counted by pointing. Giving "one for each" is done one thing at a time and
handed in; a wrong amount is counted back, never just marked. More, fewer and equal each have an activity of
their own, so that the pictures alone say what is asked.

Then, still with no numeral, amounts in order — a staircase of towers, each one block taller, with one missing —
and the pairs that make five and ten, on a frame with some places full. Only then the numerals, and each is
brought in as another way of showing an amount a child already knows: a group and its numeral, both ways about;
zero as an empty frame; a number that is said; the numbers in order on a path of stones. Last, adding and
taking away as things that happen: some more come, some go away, and how many are there now.

**What a wrong answer is answered with.** Never just the right one. A wrong numeral shows its own amount as
dots, which are counted — four notes, where three were wanted — and its name is said. A tower that does not fit
is played where the gap is, and the scale it should complete is heard to stumble. A group that does not fill
the frame is counted against the empty places. In a story everyone who is there at the end is counted. What is
counted is always named: the last number counted is how many there are.

**What is kept apart.** A numeral shows no dots except while it is being counted, so it has to be read. The
missing tower, the bare stone and the number that is said are nowhere on the page until they are found. Adding
and taking away up to five are answered with groups, not numerals, so that a child who cannot yet read a 4 can
still show that two and two make four; up to ten they are answered with numerals, and those activities name
the numerals to ten as what they build on.

**What the rules check** (`src/content/rules/numberGarden.ts`, `numberGardenNumbers.ts`): one choice has the
amount asked for and it is the one marked; no two choices show the same amount; the answer is never simply the
same picture; bigger things are never the larger amount by default, so size is not a clue. For the later
questions the amount each picture stands for is worked out from the picture by the engine
(`src/engine/numbers.ts`) and not taken from the content: a staircase really goes up by one, a path really is
in order, a story really leaves that many; a numeral is answered with amounts and an amount with numerals;
nothing is shown beyond what the activity's skill says it goes up to; and an activity is marked as needing
sound exactly when its questions are said.

| Activity            | Title                        | Challenges | A sitting                        | The child's part       |
| ------------------- | ---------------------------- | ---------- | -------------------------------- | ---------------------- |
| `ng-same-amount-01` | Same amount, up to three     | 8          | 1 shown, 2 guided, 3 of 5 alone  | a choice               |
| `ng-glance-01`      | How many, at a glance        | 11         | 1 shown, 2 guided, 4 of 8 alone  | a choice               |
| `ng-give-01`        | One for each, up to five     | 10         | 1 shown, 2 guided, 3 of 7 alone  | give an amount         |
| `ng-give-02`        | One for each, up to ten      | 11         | 1 shown, 2 guided, 3 of 8 alone  | give an amount         |
| `ng-more-01`        | Which has more?              | 13         | 1 shown, 2 guided, 4 of 10 alone | a choice               |
| `ng-fewer-01`       | Which has fewer?             | 13         | 1 shown, 2 guided, 4 of 10 alone | a choice               |
| `ng-equal-01`       | Two that are equal           | 11         | 1 shown, 2 guided, 3 of 8 alone  | pick out               |
| `ng-stairs-01`      | One more each time           | 13         | 1 shown, 2 guided, 4 of 10 alone | a choice               |
| `ng-frame-01`       | Fill the five                | 12         | 1 shown, 2 guided, 4 of 9 alone  | a choice               |
| `ng-frame-02`       | Fill the ten                 | 13         | 1 shown, 2 guided, 4 of 10 alone | a choice               |
| `ng-numerals-01`    | Numbers one to five          | 13         | 1 shown, 2 guided, 5 of 10 alone | a choice               |
| `ng-numerals-02`    | Zero, and six to ten         | 14         | 1 shown, 2 guided, 5 of 11 alone | a choice               |
| `ng-numerals-03`    | Hear a number                | 13         | 1 shown, 2 guided, 5 of 10 alone | a choice (needs sound) |
| `ng-line-01`        | The number path              | 13         | 1 shown, 2 guided, 5 of 10 alone | a choice               |
| `ng-add-01`         | Some more come               | 13         | 1 shown, 2 guided, 4 of 10 alone | a choice               |
| `ng-take-01`        | Some go away                 | 12         | 1 shown, 2 guided, 4 of 9 alone  | a choice               |
| `ng-add-02`         | More come, up to ten         | 13         | 1 shown, 2 guided, 4 of 10 alone | a choice               |
| `ng-take-02`        | Some go away, from up to ten | 13         | 1 shown, 2 guided, 4 of 10 alone | a choice               |

| Skill                           | For grown-ups                                 | What it means                                                                                                                                                                                        |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `math.quantity.match-sets-to-3` | Match small groups by amount                  | Sees that two groups of up to three things have the same amount, even when the things and how they are laid out are different. No numerals and no counting words are needed.                         |
| `math.quantity.subitize-to-4`   | See small amounts at a glance                 | Sees how many are in a group of up to four when it is shown only for a moment, without counting one by one, and matches it to a group of the same amount.                                            |
| `math.counting.give-to-5`       | Give one for each, up to five                 | Gives out exactly as many things as there are friends, up to five, one for each, and stops there without places to fill.                                                                             |
| `math.counting.give-to-10`      | Give one for each, up to ten                  | Gives out exactly as many things as there are friends, from six to ten, keeping count of how many have been given.                                                                                   |
| `math.comparison.more-to-6`     | Find which group has more                     | Picks the group with more out of two or three groups of up to six, including when the smaller group is made of bigger things.                                                                        |
| `math.comparison.fewer-to-6`    | Find which group has fewer                    | Picks the group with fewer out of two or three groups of up to six, including when the larger group is made of smaller things.                                                                       |
| `math.comparison.equal-to-6`    | Find two groups that are equal                | Out of three or four groups of up to six, finds the two that have the same amount, whatever they are made of and however they are laid out.                                                          |
| `math.order.one-more-to-6`      | Put amounts in order, one more each time      | Sees that amounts in order go up by one each time, and finds the amount that is missing from a row of towers of up to six blocks: the next, one in between, the first, and going down as well as up. |
| `math.bonds.to-5`               | See how many more make five                   | Given part of five on a frame of five places, finds the group that fills the rest, wherever the full places are.                                                                                     |
| `math.bonds.to-10`              | See how many more make ten                    | Given part of ten on a frame of ten places, finds the group that fills the rest, wherever the full places are.                                                                                       |
| `math.numerals.read-to-5`       | Match the numerals 1 to 5 with amounts        | Finds the numeral for a group of one to five things, and the group for a numeral, however the group is laid out.                                                                                     |
| `math.numerals.read-to-10`      | Match the numerals 0 and 6 to 10 with amounts | Finds the numeral for an amount from six to ten shown on a frame of ten, and the amount for a numeral; knows that an empty frame is zero.                                                            |
| `math.numerals.hear-to-10`      | Find the numeral for a number that is said    | Hears a number from zero to ten and picks out its numeral from three, including numerals that look or sound alike.                                                                                   |
| `math.numerals.order-to-10`     | Know the order of the numbers 0 to 10         | Finds the number missing from a run of three to five numbers in order: the next, one in between, the first, and counting back as well as on.                                                         |
| `math.adding.within-5`          | Add within five, as a story                   | When some more come to a group, finds how many there are now, up to five, and shows it with a group of the same amount.                                                                              |
| `math.taking-away.within-5`     | Take away within five, as a story             | When some of a group of up to five go away, finds how many are left and shows it with a group of the same amount.                                                                                    |
| `math.adding.within-10`         | Add within ten, as a story                    | When some more come to a group, finds how many there are now, up to ten, and picks the numeral for it.                                                                                               |
| `math.taking-away.within-10`    | Take away within ten, as a story              | When some of a group of up to ten go away, finds how many are left, including none, and picks the numeral for it.                                                                                    |

**Why a wrong choice is tempting** is written on every wrong choice of the later questions, for the grown-ups'
report and for the mastery engine to come. Most are how far off the choice is (`one-more`, `one-fewer`,
`many-more`, `many-fewer`). Four are ideas of their own: `counted-what-was-there-first` and
`counted-those-that-came` or `-left` in a story; `counted-the-full-places` where the empty ones were asked for;
and `looks-alike`, a 6 taken for a 9 or a 9 for a 6.

### Robot Ridge — `robot-ridge.v2.json` (contentVersion 2)

7 activities, 73 challenges, 7 skills, 25 spoken lines (and two more that Glim says of the bridge, kept with the
lines every world shares). Written by `scripts/content/robot-ridge.mjs`. The first four activities are the
world as it went live, and they are byte for byte what they were; the other three come after them.

**How it teaches.** A robot, a star, and arrows: forward, turn left, turn right. First each tap is carried out at
once. Then a row of steps is planned and run. Then a short row is done over, two to four times. Then a row with
one wrong step is run, seen to go wrong, and mended. A bump costs nothing; a run that does not arrive stays where
it stopped; nothing is timed.

**A longer way, and a long way round** (the brief's R2: four to ten steps, run a step at a time and back). Rocks
stand between the robot and the star, and there is one shortest way round them. The row has exactly as many
places as that way has steps, so the row itself says how long the way is. It is too long for each step to be a
button: the steps are small tiles, in two lines on a phone, and the row is changed from its end, with a key that
takes the last step out. "Go" runs it. Two buttons beside the row run it one step on and one step back, and the
robot stays where the steps so far have taken it while more are put in. **What is handed in is the run of a
full row carried out to its end, however it was run.** A row with places still empty can be run and looked at
as often as a child likes and is nobody's answer; a full row gone over again after it was handed in is not
handed in twice.

**Wait for the bridge** (the brief's R5, its optional last step: a rule that depends on what the robot finds).
There is a river, and a bridge that may be up or down: nobody knows which until a run begins, and until then it
is drawn going up and down. One more arrow, three dots, says "if the bridge is up, wait for it". A program is
right only if it gets over however the bridge stands, so it is **judged with the bridge up**. One that works is
then shown with the bridge as its journey says: up, where the robot is seen to wait and the bridge to come down;
or down, where the same step is seen to be passed over. One that does not work is shown the run it fails in. In
the demonstration Glim runs the same row twice, once each way.

**What the rules check** (`src/content/rules/robotRidge.ts`): every puzzle is solved by the engine's own solver
when the pack is built; a puzzle about doing it again cannot be done in the row without doing it again; a row to
mend is one step away from working; no grid is taller than three rows, and no row that is pressed is longer
than five places, so that it fits a small phone. A longer plan has four steps or more and ten at most, a row
exactly as long as its way, and one way only that short (help that shows "the" way must not take a child's own
good steps out of the row). A bridge cannot be gone round, cannot be got over without waiting, and the program
shown waits once. Every journey that is done once is also measured a second time, by other code that walks the
ground instead of trying programs (`src/content/robot-ridge/ways.ts`), and the two must agree.

**What the record cannot tell.** A child can make a long row a step at a time, putting one step in and watching
the robot do it before choosing the next. What is written down is that the first full row arrived; it does not
tell that from a row planned whole and then run. The two skills are worded to match ("may run the plan a step
at a time"), and nothing here claims that a child plans ten steps ahead. And whether a child of four or five
reads three dots as "wait", or a bridge drawn from above as up or down, nobody knows: no child has seen it.

| Activity       | Title                         | Challenges | A sitting                        | The child's part |
| -------------- | ----------------------------- | ---------- | -------------------------------- | ---------------- |
| `rr-move-01`   | One arrow, one move           | 10         | 1 shown, 2 guided, 3 of 7 alone  | a row of steps   |
| `rr-steps-01`  | Two and three steps in order  | 14         | 1 shown, 2 guided, 3 of 11 alone | a row of steps   |
| `rr-repeat-01` | Do it again                   | 10         | 1 shown, 2 guided, 3 of 7 alone  | a row of steps   |
| `rr-mend-01`   | Find the step that went wrong | 9          | 1 shown, 2 guided, 3 of 6 alone  | a row of steps   |
| `rr-plan-01`   | A longer way                  | 10         | 1 shown, 2 guided, 3 of 7 alone  | a row of steps   |
| `rr-bridge-01` | Wait for the bridge           | 10         | 1 shown, 2 guided, 3 of 7 alone  | a row of steps   |
| `rr-plan-02`   | A long way round              | 10         | 1 shown, 2 guided, 3 of 7 alone  | a row of steps   |

| Skill                              | For grown-ups                                   | What it means                                                                                                                                                                                                                               |
| ---------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coding.commands.one-move`         | Know what each arrow does                       | Takes the robot to a goal one command at a time: knows that forward moves it one square the way it is facing, and that a turn changes the way it faces without moving it.                                                                   |
| `coding.sequence.plan-short`       | Plan two or three steps                         | Puts two or three commands in order before any of them is carried out, so that the robot reaches the goal when the program is run.                                                                                                          |
| `coding.repeat.do-again`           | Make steps happen again                         | Uses "do it again" so that a short program takes the robot a long way, on journeys that are too long for the program without it.                                                                                                            |
| `coding.debug.mend-one-step`       | Find and mend a wrong step                      | Watches a program go wrong, finds the one step that sends the robot the wrong way, and changes that step so that the robot arrives.                                                                                                         |
| `coding.sequence.plan-to-six`      | Plan a way of four to six steps                 | Puts four, five or six commands in order before the robot sets off, round rocks that are in the way, so that it reaches the goal. May run the plan a step at a time to see where it goes.                                                   |
| `coding.sequence.plan-to-ten`      | Plan a long way, up to ten steps                | Puts seven to ten commands in order for a way that winds between rocks, and when the robot does not arrive finds the step that went wrong and changes the plan from there.                                                                  |
| `coding.condition.wait-for-bridge` | Use a step that depends on what the robot finds | Puts \"wait for the bridge\" where it belongs in a row of steps, so that the robot reaches the goal whether the bridge turns out to be up or down: the same step waits when there is something to wait for and passes on when there is not. |

### Memory Forest — `memory-forest.v2.json` (contentVersion 2)

8 activities, 93 challenges, 13 skills, 61 spoken lines (58 in the pack, and three that name the ways of
looking). Written by `scripts/content/memory-forest.mjs`. The first six activities are what they were in
`v1`, challenge for challenge; the last two are new.

**How it teaches.** Pairs, first face up to learn the game and then face down. Things looked at and then covered
by a leaf, and a question about one of them. An order to repeat. Three ways to remember, each shown and then
used: grouping, a silly picture of who has what, and places along a path. Then the choice is the child's: four
things, and three pictures under them that lay the same four out in two groups, as who has what, or each at a
place. The way they are in when the child puts them away is the way that was chosen, and the question that
follows has the hint that belongs to it: one of a group, an owner, a place. Straight after, the same four are
asked for with no hint at all. And last, five things, all new, and three things to keep: picked out once now,
and asked for again at the start of the next visit with nothing shown.

**What is kept apart.** Knowing a thing again, repeating an order, recalling from a hint and recalling with none
are separate skills, and so are recalling later the same day and recalling on another day. Nothing adds them up
or calls the result memory. What is covered is not in the page at all, and the cards to answer with are blank
while things are on show; asking for another look is help and is recorded as help. Which way a child chose is
written into each answer (`story-drum`), so it can be read later; nothing is made of it now.

**What "next time" means.** The three things kept are asked for at the start of the next sitting of that
activity, if at least ten minutes have gone by since the last one ended: sooner than that the sitting simply
does not ask, because recalling a thing a moment after being told it is no measure of keeping it. A later day
is a later date on the device's own calendar. The two are different skills. Each sitting keeps a set it did not
keep the time before.

| Activity       | Title                   | Challenges | A sitting                                                        | The child's part                 |
| -------------- | ----------------------- | ---------- | ---------------------------------------------------------------- | -------------------------------- |
| `mf-pairs-01`  | Find the pairs          | 9          | 1 shown, 2 guided, 3 of 6 alone                                  | find pairs                       |
| `mf-hidden-01` | Which one was there?    | 12         | 1 shown, 2 guided, 4 of 8 alone, 1 at the end                    | a choice                         |
| `mf-order-01`  | The same order          | 11         | 1 shown, 2 guided, 4 of 8 alone                                  | repeat an order                  |
| `mf-groups-01` | Things that go together | 9          | 1 shown, 2 guided, 3 of 6 alone                                  | pick out                         |
| `mf-story-01`  | Who had what?           | 11         | 1 shown, 2 guided, 4 of 8 alone                                  | a choice                         |
| `mf-places-01` | What was where?         | 11         | 1 shown, 2 guided, 4 of 8 alone                                  | a choice                         |
| `mf-choose-01` | Remember it your way    | 12         | 1 pair shown, 1 pair guided, 2 pairs of 4 alone                  | choose a way; a choice; pick out |
| `mf-later-01`  | Keep it for next time   | 18         | (what was kept, if any,) 1 shown, 1 guided, 2 of 4 alone, 1 kept | pick out                         |

A pair is a question with a hint and, straight after it, the same things asked for with none. A pair that
needed help is asked again as a pair, with other things.

| Skill                                | For grown-ups                            | What it means                                                                                                                                                                                                  |
| ------------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `memory.recognition.find-pairs`      | Find pairs among cards face down         | Finds every pair among six or eight cards lying face down, in no more turns than remembering where things are would need.                                                                                      |
| `memory.recognition.what-was-there`  | Know again what was just hidden          | After looking at two to four things that are then covered, picks out one that was there from pictures of things that were not.                                                                                 |
| `memory.recognition.after-a-while`   | Know again what was seen a while ago     | At the end of an activity, picks out a thing shown at its very start and not seen since. One question, kept apart from the others: a longer wait is a different thing to manage.                               |
| `memory.serial.repeat-order`         | Remember an order                        | Watches three or four things light up one after another and taps them in the same order.                                                                                                                       |
| `memory.strategy.grouping`           | Remember by grouping                     | Looks at four things that fall into two kinds, and after they are put away picks all four out from among others, with nothing to prompt them.                                                                  |
| `memory.strategy.linking`            | Remember by linking two things           | Looks at two or three pairs — who had what — and, shown one of them, says what went with it.                                                                                                                   |
| `memory.strategy.places`             | Remember by places                       | Looks at things left at two or three places and, shown one place, says what was there.                                                                                                                         |
| `memory.cued.chosen-way`             | Recall from a hint, looking your own way | Chooses how to look at four things (in groups, as a silly story, or at places) and, when they are put away and a hint is given, says what went with it. Which way was chosen is written down with each answer. |
| `memory.unaided.four-after-choosing` | Recall four things with no hint          | Straight after that, picks all four out from among eight with no hint at all. Counted apart from the question with a hint: what a hint brings back and what comes back by itself are different things.         |
| `memory.unaided.five-things`         | Recall five things                       | Looks at five things of two kinds, none of them met in the earlier activities, and after they are put away picks all five out from among eight.                                                                |
| `memory.delayed.keep-three`          | Take in three things to keep             | Looks at three things to keep for next time and picks them out straight away. This shows only that they were taken in; whether they were kept is asked at the next visit.                                      |
| `memory.delayed.same-day`            | Recall them later the same day           | At the start of a later visit on the same day, ten minutes or more after the three things were shown, picks them out with nothing shown again.                                                                 |
| `memory.delayed.another-day`         | Recall them on another day               | At the start of a visit on a later day, picks out the three things kept, with nothing shown again. Kept apart from the same day: a night between is a different wait.                                          |

### Inventor Island — `inventor-island.v2.json` (contentVersion 2)

5 activities, 66 challenges, 10 skills, 58 spoken lines. Written by `scripts/content/inventor-island.mjs`. The
first four activities are what they were in `v1`, challenge for challenge; the fifth is new.

**How it teaches.** Each activity is two things. A guess: something is set up — a goat and a plank, a ball and
a ramp, a wall in the wind — and the child says what will happen before it is tested in front of them; a guess
that did not come true is kept beside what did happen, not rubbed out. And a mend: a thing that does not work
is on a bench with its parts to change, and each change is tested.

**A shelter from the wind** is the fifth: a wall stood up to keep the wind off a plant. The wind comes from the
left in some questions and from the right in others, and a prop is on one side of the wall or the other, so
that neither "it has a prop" nor "the prop is on the right" tells whether the wall will stand: only where the
prop is against where the wind comes from. A wall that blows over goes over away from the wind, a prop that
held nothing comes down after it, and the plant bends. To mend one, the child moves the prop, or makes the
wall as tall as what is behind it and then finds that a taller wall needs holding.

| Activity        | Title                   | Challenges | A sitting                        | The child's part          |
| --------------- | ----------------------- | ---------- | -------------------------------- | ------------------------- |
| `ii-bridge-01`  | Bridges that hold       | 12         | 2 shown, 2 guided, 3 of 8 alone  | a choice, mend on a bench |
| `ii-ramp-01`    | Ramps and rolling       | 12         | 2 shown, 2 guided, 3 of 8 alone  | a choice, mend on a bench |
| `ii-balance-01` | Balancing               | 12         | 2 shown, 2 guided, 3 of 8 alone  | a choice, mend on a bench |
| `ii-float-01`   | Float or sink           | 16         | 2 shown, 2 guided, 4 of 12 alone | a choice, mend on a bench |
| `ii-shelter-01` | A shelter from the wind | 14         | 2 shown, 2 guided, 3 of 10 alone | a choice, mend on a bench |

| Skill                         | For grown-ups                               | What it means                                                                                                                                                      |
| ----------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `engineering.bridge.predict`  | Guess whether a bridge will hold            | Looks at a plank bridge — how wide the gap, how thick the plank, how many posts, who is crossing — and says whether it will hold before it is tested.              |
| `engineering.bridge.build`    | Mend a bridge that sags                     | Changes a bridge that sags, by a thicker plank or by posts, until it holds, testing after each change.                                                             |
| `engineering.ramp.predict`    | Guess where a rolling ball will stop        | Looks at how high a ramp is and whether the ground is rough or smooth, and says whether the ball will stop short of the star, on it or past it.                    |
| `engineering.ramp.build`      | Set a ramp so the ball stops on the star    | Changes the height of a ramp and the ground it rolls onto until the ball stops where it is wanted, testing after each change.                                      |
| `engineering.balance.predict` | Guess which way a beam will tip             | Looks at how many blocks are on each side of a beam and how far out they are, and says which side will go down or that it will balance.                            |
| `engineering.balance.build`   | Make a beam balance                         | Places blocks on one side of a beam to balance the other, using both how many and how far out.                                                                     |
| `engineering.float.predict`   | Guess what floats and what sinks            | Says whether a thing will float or sink before it is dropped in water, going by what it is made of and not by how big it is; and whether a loaded boat will float. |
| `engineering.float.build`     | Choose a boat that carries the load         | Carries stones across a pond by choosing a boat big enough and loading it with all of them and no more than it can bear.                                           |
| `engineering.shelter.predict` | Guess whether a wall will stand in the wind | Looks at which way the wind blows and how hard, how tall the wall is and where it is propped, and says whether it will stand before it is tested.                  |
| `engineering.shelter.build`   | Build a shelter that stands                 | Mends a wall that lets the wind through, by making it as tall as what is behind it and propping it on the side away from the wind, testing after each change.      |

#### The models, and where each stops being true

Five small, exact, made-up models (`src/engine/models.ts`) say what happens when a thing is tested. Each is a
few lines of arithmetic on whole numbers, the same every time, so that a child who changes one part sees what
that one change did. **They are right about which way a change pushes and not about how much, and none of them
is physics.** The game never says they are: nothing a child or a grown-up is shown calls a result real, and
each activity ends with something to try with real things, where the world gets the last word.

Each model's rule and what it leaves out are written beside it in the code, and its tests
(`tests/engine/models.test.ts`) hold it to set-ups worked out by hand, to the directions it claims (a change
that should help never hurts), and to doing the same thing every time. This table is the same thing for a
reader who will not open the code.

| Model       | Its rule                                                                                                                                                                    | Right about                                                                                                      | Wrong about, or silent on                                                                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The bridge  | Holds when twice the plank's thickness, times one more than the number of posts, is at least the traveller's weight times the gap                                           | A thicker plank, more posts, a lighter traveller and a narrower gap each help, and never hurt                    | A real plank twice as thick is far more than twice as strong; the plank's own weight; bounce; how the ends are held; where the traveller is standing (the worst place is assumed)                                           |
| The ramp    | The ball rolls one, two or three lengths from a low, middling or high ramp on rough ground, and twice that on smooth                                                        | Higher rolls further; rough ground stops it sooner; how heavy the ball is makes no difference, as nearly in life | Real distance does not double so neatly; the ball's size and what it is made of; bumps; that a ball slows on the ramp as well. No ramp here can reach the fifth length at all, which is arithmetic and not nature           |
| The balance | Each side pushes down by its blocks times their distance from the middle; the heavier push goes down; equal pushes balance                                                  | This is the law of the lever, and for equal blocks on a stiff beam it is right                                   | The beam's own weight; friction at the middle; blocks sliding as it tips; how far it tips (a real beam goes down until it meets the ground)                                                                                 |
| The boat    | The shell carries one stone, the bark boat two, the raft three; one more and it goes under. Dropped in a tub, a thing floats or sinks by what it is made of                 | A bigger boat carries more; size does not decide what floats, what a thing is made of does                       | A boat's own weight; where the stones sit (a real boat loaded to one side tips over); waves; that stones differ; a leaf that soaks and sinks in the end; a spoon laid so gently that it sits on the surface for a moment    |
| The shelter | Wind pushes a wall away from itself, a tall wall twice as hard as a low one. A low wall stands in a breeze alone; anything more needs a prop on the side away from the wind | A wall falls away from the wind; a prop holds from the side it would fall to; a taller wall catches more wind    | Wind that swings round or comes and goes; a prop that slips, sinks or snaps; pegs and ropes, which do hold from the windward side; the wall's weight and width; that wind curls over a real wall and reaches down behind it |

**What a model is never used for.** No model's result is recorded as a fact about the world, and no skill here
says a child "knows" why bridges hold. What is recorded is what a child guessed about this set-up, and whether
they mended this one.

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
| `number-garden` (contentVersion 3) | the pack: `src/content/packs/number-garden.v3.json`               |
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

### The Music Lab — `music-lab.v2.json` (contentVersion 2)

6 activities, 68 challenges, 6 skills, 51 spoken lines. Written by `scripts/content/music-lab.mjs`. It is in the
lighthouse, and beside its activities it has a room to play in freely, where nothing is asked and nothing is
kept.

**How it teaches.** By ear, and from far apart to close together. High and low begin on chime bars two octaves
apart, where the small bar can be seen to be the high one; then birds that look exactly alike sing them, down to
a third apart, so that only listening will do. Two tunes are the same or different: at first one goes up and
one comes down, at last one note is changed. A beat is listened to for four beats and then tapped. Notes are
played back in the order they sounded. A tune is found again among tunes with the same notes in another order.
And a tune is made up to a shape — up, down, a hill, the same twice, home to the lowest bar — which is the one
place in the game with many right answers, all of them the child's own.

**Every question can be heard again**, by tapping Glim, as often as asked, and it is never counted as help:
hearing a question is the question. And **nothing can be answered until the last of it has sounded**: a tap
after the first of two notes would be a guess at a question not yet put.

**Keeping time** (`keepTime`, `src/engine/music.ts`) is rough tempo and nothing finer. Each tap goes with the
beat it is nearest to. The taps' own steady lateness — their median, up to a third of a beat — is taken off,
because a speaker that sounds late, a screen that reports a touch late and a child who is always a shade behind
all look the same from here and none of them is being out of time. Then a tap within 26 % of a beat either way
has met its beat, and meeting six beats of eight is keeping the beat. Tapping twice as fast meets every beat and
is not keeping it: taps that belong to no beat are counted, and more than one in four is too many. A beat that
was not met is never marked: the lights of the ones that were met come on, and the beat comes round again.
After three tries that were not in time Glim taps along, and then tapping with it at all is enough.

**With the sound off.** _Tapping with the beat_ and _Play it back_ can be done by eye — the beat is lit as well
as clicked, the bars light as they sound — and so can _Make a tune_, whose shape is drawn as it is made. The
other three are nothing but listening: they say they need sound, and wait behind one large button that turns it
on. The room to play in does the same.

**What is deliberately not here.** No notation. No note names said to the child. No black keys: every tune is
on the white keys from middle C up, because a phone's speaker gives almost nothing below it (the rules refuse a
note outside C4 to E6). No song: every phrase was made up for this game from steps and skips of two to four
notes. And nothing called talent: a test fails if that word, or gifted, or ability, appears in a skill.

**What the rules check** (`src/content/rules/musicLab.ts`, 32 of them): in a question about high and low, each
choice is one note, no two the same, at least a tone apart, the one marked is the highest (or lowest), and
where a child answers alone the choices are not bars, which give it away by their size; "the same" is right
exactly when the two are the same, and they are as long as each other so that counting cannot answer it; of the
little birds exactly one sings what the big bird sang; bars stand lowest first, each called by its own note; a
beat's picture is of that beat and a tune's sign is of its shape; and an activity whose questions can only be
heard says it needs sound.

| Activity         | Title                   | Challenges | A sitting                       | The child's part   |
| ---------------- | ----------------------- | ---------- | ------------------------------- | ------------------ |
| `ml-high-low-01` | High and low            | 13         | 2 shown, 3 guided, 4 of 8 alone | a choice           |
| `ml-same-01`     | The same, or different? | 13         | 2 shown, 3 guided, 4 of 8 alone | a choice           |
| `ml-beat-01`     | Tapping with the beat   | 9          | 1 shown, 2 guided, 3 of 6 alone | tap a drum in time |
| `ml-echo-01`     | Play it back            | 11         | 1 shown, 2 guided, 4 of 8 alone | repeat an order    |
| `ml-again-01`    | The same tune again     | 11         | 1 shown, 2 guided, 4 of 8 alone | a choice           |
| `ml-tune-01`     | Make a tune             | 11         | 1 shown, 2 guided, 4 of 8 alone | make a tune        |

| Skill                           | For grown-ups                            | What it means                                                                                                                                                                   |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `music.pitch.high-low`          | Tell a high note from a low one          | Hears two or three notes sung by birds that look alike, and taps the one that was high — or, when asked, the one that was low — when the notes are as little as a third apart.  |
| `music.pattern.same-different`  | Say whether two short tunes are the same | Hears two tunes of three or four notes, or two drum patterns, one after the other, and says whether they were the same or different when only one note or one knock is changed. |
| `music.rhythm.steady-beat`      | Tap along with a slow, steady beat       | Taps a drum in time with a beat of 60 to 84 to the minute, meeting at least six beats of eight within a generous margin. This is rough tempo, not precision.                    |
| `music.memory.play-back`        | Play back a few notes in order           | Hears three or four notes played on chime bars and plays them back in the same order.                                                                                           |
| `music.pattern.repeated-phrase` | Know a tune again when it comes back     | Hears a tune of three or four notes and then two or three more, and picks out the one that was the first tune again from others with the same notes in another order.           |
| `music.making.shape-a-tune`     | Make up a tune with a shape              | Makes up a tune of three to six notes on chime bars that goes up, goes down, climbs and comes back, says the same thing twice, or comes home to the lowest bar, as asked.       |

## Where a child begins

Every world begins at its first activity, and every skill begins at "not yet observed". That is the right
beginning for a child the game knows nothing about, and the wrong one for a five-year-old who counts to twenty:
walked through "the same amount" for the sake of order, such a child learns that the game is dull.

So a grown-up who knows the child may say what they have seen (**Grown-ups → Where _name_ begins**), and choose
where the big Play button begins in each world. Six things can be said, each "not yet observed" until it is:

| What a grown-up has seen                   | What the game then suggests                                | To find out, watch them try         |
| ------------------------------------------ | ---------------------------------------------------------- | ----------------------------------- |
| Taps the thing they mean to                | nothing; if not yet, "how to play" and a grown-up's help   | —                                   |
| Listens to what the voice says             | nothing; if not yet, what can be played with the sound off | —                                   |
| Counts five things, touching each one once | Number Garden begins at counting to ten (`ng-give-02`)     | counting to five (`ng-give-01`)     |
| Hears the first sound of a word            | Reading Cove begins at the letters (`rc-letters-01`)       | the first sound (`rc-first-01`)     |
| Knows some letters by their shape or name  | **nothing**: a letter's sound is another matter            | the first letters (`rc-letters-01`) |
| Knows the sound some letters stand for     | Reading Cove begins at blending (`rc-blend-01`)            | the first letters (`rc-letters-01`) |

Three rules hold it to what it is:

1. **It is the grown-up's word, not evidence.** Nothing said here is written into the record of what the child
   has done, which is the only place "what a child has shown" is read from. A skill that a grown-up has seen
   and the game has not is still "not yet observed".
2. **Nothing is closed.** Every activity stays on its world's page, the ones before the beginning as well as
   the ones after it, and none is marked as done. Play goes to the first unfinished activity from the beginning
   that was chosen, and, when those are all finished, to the first unfinished one before it.
3. **A suggestion is only offered.** Saying that something was seen moves nothing; the grown-up takes the
   suggestion, or chooses any activity of any world, or leaves things as they are.

The suggestions are three rules written here, by nobody who teaches. They pass over what comes before a thing
in the order of a world, not only what is about it: a child who counts five things is taken past "the same
amount" and "at a glance" as well as past counting to five, until the rest is done. A teacher might order that
otherwise.

There is no test of sample questions, by decision. A handful of questions put to a four-year-old on a first
visit would be a test, and what it measured would be how the child takes to a new screen. The real activity
named beside each thing does the same work, teaches while it does it, and writes down what the child did.

## What each world does not have yet

From the briefs in `prompt-series/`; `docs/PROGRESS.md` has each brief set against what exists.

| World           | Not built                                                                                                                                                                                                                                                                                                                                                                          | Brief |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Reading Cove    | a sound on its own; a word never met before, or a made-up one, to show that a word can be read and not only known again; reading aloud that is listened to; sentences with a verb; words with two consonants together; more than three pairs of letters; capitals; letter names                                                                                                    | 05    |
| Number Garden   | giving out a number that is written (the giving games stop before numerals); patterns, shapes, measuring, estimating and coins (the brief's optional M7); counting in twos or beyond ten                                                                                                                                                                                           | 06    |
| Robot Ridge     | a condition other than waiting for a bridge (no "if … or else", and nothing is sensed but the bridge); doing a part of a row again (the whole row is done again); steps that are dragged (they are tapped, by decision)                                                                                                                                                            | 07    |
| Memory Forest   | more than five things; a way of remembering that is the child's own (the three ways are the game's, and nothing checks that the way chosen was used); waits told apart beyond "later the same day" and "another day"; anything said aloud by the child                                                                                                                             | 08    |
| Inventor Island | saying what changed after a mend (nothing in the game asks; the thing to try together asks it aloud); a heavier and a lighter ball on the ramp; a bridge of anything but a thin or a thick plank; building freely, with nothing to mend; parts that are dragged (they are changed by tapping a picture, by decision); a portfolio of more than the last thing mended at each bench | 09    |
| Explorer Harbor | making up a story; stories that branch; a globe, continents, countries, flags, people and places                                                                                                                                                                                                                                                                                   | 10    |
| The Music Lab   | tapping a rhythm back; black keys; keeping a tune a child has made; the five other rooms its brief describes                                                                                                                                                                                                                                                                       | 11    |

Open questions: who reviews the phonics content and the audio; whether a person should record the voice; how
prerequisites that cross worlds are shown on the map (nothing is locked, and Glim simply points at the next
thing not yet finished).
