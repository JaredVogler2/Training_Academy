# Curriculum

**Status: skeleton.** One skill and one lesson are authored and playable. Everything marked _planned_ below is a
plan taken from the prompt series, not something that exists. Counts in this document are of real, shipped content.

|                              | Authored and tested                                      | Planned               |
| ---------------------------- | -------------------------------------------------------- | --------------------- |
| Worlds with playable content | 1 of 6 (Number Garden)                                   | 5                     |
| Skills                       | 1                                                        | see _Planned strands_ |
| Lessons                      | 1                                                        | —                     |
| Challenges                   | 8 (1 demonstration, 2 guided, 5 in the independent pool) | —                     |

Nothing here has been reviewed by an early-years teacher or tried with a child yet. Both are required before any
claim about what the game teaches.

## Principles the content must follow

These come from `prompt-series/00_MASTER_BRIEF.md` and are enforced where a machine can enforce them.

1. **Assume nothing.** The learner may not know letters, letter sounds, numerals, or how a game works.
2. **Show before asking.** Every lesson starts with at least one demonstration and at least one guided step. _(Schema:
   `plan.demo` and `plan.guided` must be non-empty.)_
3. **No reading needed, no sound needed.** Pictures and the guide's hand carry the task; captions are for the adult
   alongside and for screen readers. Narration (Phase 04) will add to this, never replace it.
4. **Teach on a miss.** A wrong answer takes that choice away and re-teaches; it is never a red cross, a lost life or a
   timer. _(Engine behaviour; there is no "wrong" colour in the design tokens.)_
5. **Assessment is separate from practice.** Only a first-try answer with no hint and no adult help, in an independent
   step, is independent evidence. _(Engine: `isIndependentSuccess`.)_
6. **Short.** An activity is 2–5 minutes. _(Schema: `estimatedMinutes` ≤ 5; test: ≥ 2.)_
7. **Correct.** The marked answer must be the only right one. _(Content lint.)_

## How content is written

One JSON file per world: `src/content/packs/<world>.v<contentVersion>.json`.

```
ContentPack
  format, schemaVersion        file format (schemaVersion 1)
  id, world, contentVersion    bump contentVersion on every authored change; it is recorded on each attempt
  strings.en                   every caption, by key (ready for translation and, later, for matching narration clips)
  skills[]                     id, world, strand, title, objective (both for grown-ups), prerequisites[]
  lessons[]
    id, version, world, title, summary, skillIds[], estimatedMinutes
    plan
      demo[]                   challenge ids the guide demonstrates, in order
      guided[]                 challenge ids for supported practice, in order
      independent              { pool[], count, maxReprobes }
    successCriteria            { independentFirstTryCorrect }
    challenges[]               see below
```

A challenge (`kind: "choose-one"`, the only kind so far):

```
id            "<lesson-id>.<local-name>"
skillId       one of the lesson's skills
variant       a name for this presentation; independence needs success on more than one variant
prompt        { instruction: <string key>, stimulus }
choices[]     2–4 of { id, stimulus, label }      label is the picture in words ("two snails")
answer        the id of the one right choice
hints[]       the ladder, in order: model → eliminate → reveal   (must end with reveal)
misconceptions  { <distractor id>: tag }           why that distractor is tempting
feedback      { correct, incorrect }               string keys
```

Stimuli so far: `quantity` — `{ item: apple | leaf | snail | acorn, count: 1–10, arrangement: row | cluster }`. The
four things are each one plain shape with no spots, petals or other parts a child might count instead.

### ID conventions

| Thing      | Pattern                      | Example                         |
| ---------- | ---------------------------- | ------------------------------- |
| World      | fixed list                   | `number-garden`                 |
| Skill      | `strand.topic.skill`, dotted | `math.quantity.match-sets-to-3` |
| Lesson     | URL-safe slug, world prefix  | `ng-same-amount-01`             |
| Challenge  | `lesson-id.local-name`       | `ng-same-amount-01.two-apples`  |
| String key | dotted                       | `ng.same-amount.instruction`    |

IDs are permanent once content ships: the learner's record refers to them. To change what a lesson teaches, bump its
`version` (unfinished sittings of the old version are then not resumed; their answers stay in the record).

### What the content lint checks (`src/content/lint.ts`, run by `npm test`)

References (plan → challenges, lesson → skills, strings), duplicates, the prerequisite graph (unknown, self,
cycles), plan arithmetic (`count` ≤ pool, success bar ≤ `count`, at least two variants in the pool), hint ladders
(never remove the answer, reveal only on the last rung, always end with reveal), and for quantity challenges:

- exactly one choice shows the prompt's amount, and it is the marked answer;
- no two choices show the same amount;
- the right choice is not simply the same picture as the prompt (same thing _and_ same layout);
- each distractor's misconception tag (`one-more`, `one-fewer`, `many-more`, `many-fewer`) matches what it shows.

`tests/content/packs.test.ts` proves each of these rules fires on a deliberately broken copy of the real pack.

### Adding a lesson: checklist

1. Add or reuse a skill; list its prerequisites.
2. Write the challenges; give every distractor a misconception tag and every choice a spoken-style label.
3. Plan it: ≥ 1 demonstration, ≥ 1 guided, an independent pool larger than `count` with ≥ 2 variants.
4. Add strings. Bump `contentVersion` (and rename the file to match).
5. `npm test` — the schema, the lint and the "playable to the end under arbitrary play" property test must pass.
6. Play it on a phone-sized screen with the sound off and without reading the captions.
7. Record it in the tables in this file.

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

### Number Garden — `number-garden.v1.json` (contentVersion 1)

| Skill         | `math.quantity.match-sets-to-3` — Match small groups by amount                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective     | Sees that two groups of up to three things have the same amount, even when the things and how they are laid out are different. No numerals and no counting words are needed. |
| Prerequisites | none                                                                                                                                                                         |
| Strand        | number sense (stage M0 in `prompt-series/06_MATH_EXPLORERS.md`)                                                                                                              |

| Lesson                                                     | `ng-same-amount-01` — Same amount, up to three (v1, about 3 minutes)                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Demonstration                                              | 2 snails ↔ {1 leaf, **2 leaves**}                                                                                                                                  |
| Guided                                                     | 1 apple ↔ {**1 acorn**, 3 acorns}; 3 snails ↔ {2 leaves, **3 leaves (cluster)**}                                                                                   |
| Independent pool (3 drawn per sitting, 1 re-probe allowed) | 2 apples ↔ {3, 1, **2** acorns}; 3 leaves ↔ {**3**, 2, 1 snails}; 1 acorn ↔ {2, **1**, 3 apples}; 2 snails ↔ {1, **2**, 3 apples}; 3 acorns ↔ {2, **3**, 1 leaves} |
| Lesson bar                                                 | 2 of the 3 independent probes right at the first try, unaided                                                                                                      |
| Hint ladder                                                | count them one by one → one wrong group is taken away → the right group is shown                                                                                   |

Design notes and known limits of this first lesson:

- The prompt and the choices always show _different things_, and the right choice often has a _different layout_, so
  the match has to be made on amount rather than on the picture.
- Amounts stop at three, the range most young children can take in at a glance.
- The things in the group to match are drawn larger than the things in the choices, because its card is larger. Size
  is constant across the choices, so it is not a clue to the answer, but it is not yet varied deliberately either
  (Phase 06: "distinguish count from area/size").
- There is no "none of these" and no comparison (more/fewer); those are later skills.

## Planned strands (not built)

From the prompt series; the order within a world is the intended teaching order.

| World           | Strand             | Planned sequence                                                                                                                                                                                                  | Prompt |
| --------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Reading Cove    | phonics            | listening to sounds → first sounds by ear → letter shape to sound → blending → segmenting → decodable words and sentences                                                                                         | 05     |
| Number Garden   | number sense       | **same/different amounts (first lesson built)** → subitising 1–3 → counting to 5, then 10 → comparing and conservation → numerals as a way to write an amount → number bonds → adding and taking away with things | 06     |
| Robot Ridge     | coding             | one arrow, one move → sequences of 2–3 → longer plans → repeats → finding the broken step                                                                                                                         | 07     |
| Memory Forest   | memory             | matching → recall of 2–4 → recall in order → strategies (grouping, story, journey)                                                                                                                                | 08     |
| Inventor Island | engineering        | predict → build → test → change one thing: bridges, ramps, balance, floating                                                                                                                                      | 09     |
| Explorer Harbor | language and world | story beginning/middle/end and cause → land and water, near and far, places                                                                                                                                       | 10     |

Open questions to settle before Phase 05 and 06 author more: who reviews phonics content and audio; whether item
sizes vary within a set; how prerequisites that cross worlds are expressed in the hub.
