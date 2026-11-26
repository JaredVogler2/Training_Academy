import { parseContentPack, type ContentPack, type Lesson } from '@/engine';

/**
 * A pack made for the tests: one lesson with one of every kind of thing to make, so that the engine and the lint
 * can be tried on each without waiting for a world that happens to use it. It is not shipped and no child sees it.
 */

const picture = (id: string) => ({ type: 'picture', id }) as const;
const card = (id: string) => ({ id, stimulus: picture(id), label: id });
const strings = {
  instruction: 'fx.instruction',
  ask: 'fx.ask',
  model: 'fx.hint.model',
  step: 'fx.hint.step',
  reveal: 'fx.hint.reveal',
  correct: 'fx.correct',
  incorrect: 'fx.incorrect',
};
const feedback = { correct: strings.correct, incorrect: strings.incorrect };
const ladder = [
  { type: 'model', caption: strings.model },
  { type: 'step', count: 1, caption: strings.step },
  { type: 'reveal', caption: strings.reveal },
];
const skillId = 'memory.fixture.making';
const LESSON = 'fx-make-01';

const make = (name: string, variant: string, task: unknown, extra: object = {}) => ({
  id: `${LESSON}.${name}`,
  kind: 'make',
  skillId,
  variant,
  prompt: { instruction: strings.instruction },
  task,
  hints: ladder,
  feedback,
  ...extra,
});

const give = (name: string, count: number, places: boolean) =>
  make(name, `give-${String(count)}`, {
    type: 'give',
    want: { type: 'quantity', item: 'snail', count, arrangement: 'row' },
    item: 'leaf',
    pile: count + 3,
    places,
  });

const order = (name: string, ids: string[]) =>
  make(name, `order-${String(ids.length)}`, {
    type: 'order',
    cards: [...ids].reverse().map(card),
    solution: ids,
  });

const echo = (name: string, ids: string[], sequence: string[]) =>
  make(name, `echo-${String(sequence.length)}`, {
    type: 'echo',
    cards: ids.map(card),
    solution: sequence,
  });

const select = (name: string, ids: string[], solution: string[], study: boolean) =>
  make(name, `select-${String(solution.length)}`, {
    type: 'select',
    cards: ids.map(card),
    solution,
    ...(study ? { study: solution, ask: strings.ask } : {}),
  });

const pairs = (name: string, ids: string[]) =>
  make(
    name,
    `pairs-${String(ids.length)}`,
    { type: 'pairs', cards: ids.map(card), par: ids.length * 2 },
    // Pairs has no answer to show: its only help is another look.
    { hints: [{ type: 'model', caption: strings.model }] },
  );

const program = (name: string, task: object) =>
  make(name, `program-${name}`, {
    type: 'program',
    commands: ['forward', 'left', 'right'],
    repeats: 1,
    live: false,
    rocks: [],
    ...task,
  });

const design = (name: string) =>
  make(
    name,
    'design-ramp',
    {
      type: 'design',
      model: 'ramp',
      given: { surface: 'smooth', target: 4 },
      controls: [{ id: 'height', options: ['low', 'mid', 'high'] }],
      solution: ['mid'],
    },
    // One part to choose: there is nothing to give a part of.
    {
      hints: [
        { type: 'model', caption: strings.model },
        { type: 'reveal', caption: strings.reveal },
      ],
    },
  );

const beat = (name: string) =>
  make(
    name,
    'beat-slow',
    { type: 'beat', tempo: 60, lead: 4, beats: 8, need: 6 },
    {
      hints: [
        { type: 'model', caption: strings.model },
        { type: 'reveal', caption: strings.reveal },
      ],
    },
  );

const tune = (name: string) =>
  make(name, 'tune-up', {
    type: 'tune',
    notes: ['c4', 'e4', 'g4', 'c5'],
    length: 3,
    shape: 'up',
    solution: ['c4', 'e4', 'g4'],
  });

// A second lesson, for what a plan can ask beside the usual: things looked at in a chosen way, a question that is
// asked straight after another, and something kept from one sitting to the next.
const KEEP = 'fx-keep-01';
const unaidedSkill = 'memory.fixture.unaided';
const keptSkill = 'memory.fixture.kept';
const scene = (name: string, of: object) => ({ type: 'scene', scene: name, of });

/** Four things, looked at in groups or as a story, and asked about with a hint. */
const ownWay = (name: string, [a, b, c, d]: string[], [lureA, lureB]: string[]) => ({
  id: `${KEEP}.way-${name}`,
  kind: 'make',
  skillId,
  variant: `way-${name}`,
  prompt: { instruction: strings.instruction },
  task: {
    type: 'recall',
    cards: [a, b, c, d, lureA, lureB].map((id) => card(id ?? '')),
    study: [a, b, c, d],
    ways: [
      {
        way: 'groups',
        scene: scene('groups', { ids: [a, b, c, d] }),
        cue: picture(a ?? ''),
        ask: strings.ask,
        choices: [b, d, lureA],
        answer: b,
      },
      {
        way: 'story',
        scene: scene('pairs', { owners: [a, b], things: [c, d] }),
        cue: picture(b ?? ''),
        ask: strings.ask,
        choices: [d, c, lureB],
        answer: d,
      },
    ],
  },
  hints: [
    { type: 'model', caption: strings.model },
    { type: 'reveal', caption: strings.reveal },
  ],
  maxTries: 2,
  feedback,
});

/** The same four, asked for straight after with no hint. */
const allOf = (name: string, ids: string[], others: string[]) => ({
  id: `${KEEP}.way-${name}-all`,
  kind: 'make',
  skillId: unaidedSkill,
  variant: `all-${name}`,
  prompt: { instruction: strings.instruction },
  task: {
    type: 'select',
    cards: [...ids, ...others].map(card),
    solution: ids,
    recalled: 'just-now',
  },
  hints: ladder,
  feedback,
});

/** Things to keep for next time, and the two questions about them at a later sitting. */
const keeping = (name: string, ids: string[], others: string[]) => {
  const cards = [...ids, ...others].map(card);
  const back = (when: string) => ({
    id: `${KEEP}.back-${name}-${when}`,
    kind: 'make',
    skillId: keptSkill,
    variant: `back-${name}`,
    prompt: { instruction: strings.instruction },
    task: { type: 'select', cards, solution: ids, recalled: 'last-time' },
    hints: ladder,
    feedback,
  });
  return [
    {
      id: `${KEEP}.keep-${name}`,
      kind: 'make',
      skillId: keptSkill,
      variant: `keep-${name}`,
      prompt: { instruction: strings.instruction },
      task: { type: 'select', cards, solution: ids, study: ids, ask: strings.ask },
      hints: ladder,
      feedback,
    },
    back('same-day'),
    back('later-day'),
  ];
};

const WAY_SETS: [string, string[], string[], string[]][] = [
  ['demo', ['cat', 'hen', 'hat', 'sock'], ['fox', 'cap'], ['drum', 'sun']],
  ['guided', ['owl', 'bat', 'cup', 'pan'], ['bee', 'pot'], ['bell', 'moon']],
  ['a', ['fox', 'ram', 'key', 'map'], ['cat', 'pen'], ['egg', 'star']],
  ['b', ['bee', 'ant', 'nut', 'fig'], ['owl', 'pea'], ['hat', 'mug']],
  ['c', ['hen', 'rat', 'jam', 'pie'], ['bat', 'bun'], ['sock', 'cup']],
];
const KEEP_SETS: [string, string[], string[]][] = [
  ['a', ['kite', 'shell'], ['ball', 'leaf']],
  ['b', ['boat', 'lamp'], ['kite', 'coin']],
  ['c', ['coin', 'ball'], ['boat', 'shell']],
];
const wayId = (name: string) => `${KEEP}.way-${name}`;

const raw = {
  format: 'training-academy.content-pack',
  schemaVersion: 1,
  id: 'fixture',
  world: 'memory-forest',
  contentVersion: 1,
  strings: {
    en: {
      [strings.instruction]: 'Make it.',
      [strings.ask]: 'Which ones were there?',
      [strings.model]: 'Watch again.',
      [strings.step]: 'Here is a start.',
      [strings.reveal]: 'Like this.',
      [strings.correct]: 'Yes.',
      [strings.incorrect]: 'Not yet.',
    },
  },
  skills: [
    {
      id: skillId,
      world: 'memory-forest',
      strand: 'memory',
      title: 'A skill for the tests',
      objective: 'Makes each kind of thing the engine can ask for.',
      prerequisites: [],
    },
    {
      id: unaidedSkill,
      world: 'memory-forest',
      strand: 'memory',
      title: 'Another, for what is asked straight after',
      objective: 'Answers the question that follows with no hint.',
      prerequisites: [],
    },
    {
      id: keptSkill,
      world: 'memory-forest',
      strand: 'memory',
      title: 'And one for what is kept',
      objective: 'Keeps something from one sitting to the next.',
      prerequisites: [],
    },
  ],
  lessons: [
    {
      id: LESSON,
      version: 1,
      world: 'memory-forest',
      title: 'Every kind of thing to make',
      summary: 'One of each, for the tests.',
      skillIds: [skillId],
      estimatedMinutes: 3,
      plan: {
        demo: [`${LESSON}.give-demo`],
        guided: [`${LESSON}.order-three`, `${LESSON}.echo-two`],
        independent: {
          pool: [
            `${LESSON}.select-two`,
            `${LESSON}.pairs-three`,
            `${LESSON}.give-four`,
            `${LESSON}.order-four`,
            `${LESSON}.echo-three`,
            `${LESSON}.recall-two`,
            `${LESSON}.round-the-rock`,
            `${LESSON}.mend-it`,
            `${LESSON}.ramp`,
            `${LESSON}.keep-time`,
            `${LESSON}.climb`,
          ],
          count: 11,
          maxReprobes: 0,
        },
      },
      successCriteria: { independentFirstTryCorrect: 4 },
      challenges: [
        give('give-demo', 3, true),
        order('order-three', ['seed', 'sprout', 'flower']),
        echo('echo-two', ['owl', 'fox', 'bat'], ['fox', 'owl']),
        select('select-two', ['cat', 'dog', 'hat', 'drum'], ['cat', 'hat'], false),
        pairs('pairs-three', ['sun', 'moon', 'star']),
        give('give-four', 4, false),
        order('order-four', ['egg', 'chick', 'hen', 'nest']),
        echo('echo-three', ['owl', 'fox', 'bat', 'bee'], ['bee', 'owl', 'bat']),
        select('recall-two', ['cup', 'key', 'sock', 'bell', 'map'], ['key', 'bell'], true),
        // Up the left side and along the top: the straight way is blocked.
        program('round-the-rock', {
          grid: { columns: 3, rows: 3 },
          start: { at: [0, 2], facing: 'north' },
          goal: [2, 0],
          rocks: [[1, 1]],
          slots: 6,
          solution: 'f-f-r-f-f',
        }),
        // Three squares straight ahead, and a program that turns off after the first.
        program('mend-it', {
          grid: { columns: 4, rows: 2 },
          start: { at: [0, 1], facing: 'east' },
          goal: [3, 1],
          slots: 3,
          given: 'f-l-f',
          solution: 'f-f-f',
        }),
        design('ramp'),
        beat('keep-time'),
        tune('climb'),
      ],
    },
    {
      id: KEEP,
      version: 1,
      world: 'memory-forest',
      title: 'What a plan can ask beside the usual',
      summary: 'Two questions that go together, and something kept for next time.',
      skillIds: [skillId, unaidedSkill, keptSkill],
      estimatedMinutes: 3,
      plan: {
        demo: [wayId('demo')],
        guided: [wayId('guided')],
        independent: { pool: [wayId('a'), wayId('b'), wayId('c')], count: 2, maxReprobes: 1 },
        then: Object.fromEntries(WAY_SETS.map(([name]) => [wayId(name), `${wayId(name)}-all`])),
        keep: {
          pool: KEEP_SETS.map(([name]) => `${KEEP}.keep-${name}`),
          recall: Object.fromEntries(
            KEEP_SETS.map(([name]) => [
              `${KEEP}.keep-${name}`,
              {
                sameDay: `${KEEP}.back-${name}-same-day`,
                laterDay: `${KEEP}.back-${name}-later-day`,
              },
            ]),
          ),
        },
      },
      // Two pairs and the thing to keep: as many as a sitting asks alone, so that the lint has to count them all.
      successCriteria: { independentFirstTryCorrect: 5 },
      challenges: [
        ...WAY_SETS.flatMap(([name, ids, lures, others]) => [
          ownWay(name, ids, lures),
          allOf(name, ids, [...lures, ...others]),
        ]),
        ...KEEP_SETS.flatMap(([name, ids, others]) => keeping(name, ids, others)),
      ],
    },
  ],
};

export function fixturePack(): ContentPack {
  const parsed = parseContentPack(structuredClone(raw));
  if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
  return parsed.value;
}

export function fixtureLesson(): Lesson {
  const lesson = fixturePack().lessons[0];
  if (!lesson) throw new Error('The fixture pack has no lesson.');
  return lesson;
}

/** The fixture's second lesson: two questions that go together, and something kept from one sitting to the next. */
export function fixtureKeepLesson(): Lesson {
  const lesson = fixturePack().lessons[1];
  if (!lesson) throw new Error('The fixture pack has no second lesson.');
  return lesson;
}
