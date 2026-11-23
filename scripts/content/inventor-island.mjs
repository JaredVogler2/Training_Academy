// Inventor Island's content pack: four workbenches, each with things to guess and things to mend.
//
//   bridges that hold     a plank across a gap, and someone to cross it
//   ramps and rolling     a ball down a ramp, to stop on the star
//   balancing             blocks on a beam
//   float or sink         things dropped in a tub, and a boat to carry stones
//
// Two kinds of challenge, in every lesson:
//
//   a guess     a set-up is shown; what will happen? The answer is found out by testing it, on the screen.
//   a mend      a set-up that does not work is shown; change it until it does.
//
// Each table row states a set-up and, in so many words, what happens when it is tested or how it is mended. The
// rows are the calibration: nothing here works the answer out. The models that say what really happens are in
// src/engine/models.ts, and the content lint holds every row to them — a row that says a bridge holds when the
// model says it sags fails the tests. So a mistake has to be made twice, the same way, to get through.

const LETTERS = ['a', 'b', 'c'];
const WORLD = 'inventor-island';

const scene = (name, of) => ({ type: 'scene', scene: name, of });

/** What a child can be shown happening at each bench, and how each is said to a grown-up. */
const HAPPENS = {
  bridge: { held: 'It holds', sagged: 'It sags' },
  ramp: {
    'rolled-short': 'It stops too soon',
    landed: 'It stops on the star',
    'rolled-past': 'It rolls too far',
  },
  balance: {
    'tipped-left': 'The blue side goes down',
    balanced: 'It balances',
    'tipped-right': 'The orange side goes down',
  },
  boat: { floated: 'It floats', sank: 'It sinks' },
  tub: { floated: 'It floats', sank: 'It sinks' },
};

/** Which lines each bench's guesses are asked and answered in. The tub and the boat share theirs. */
const SAYS = { bridge: 'bridge', ramp: 'ramp', balance: 'balance', boat: 'float', tub: 'float' };

/** What can be changed at each bench, in the order it is shown. */
const PARTS = {
  bridge: { plank: ['thin', 'thick'], posts: ['none', 'one', 'two'] },
  ramp: { height: ['low', 'mid', 'high'], surface: ['rough', 'smooth'] },
  balance: { weight: ['one', 'two', 'three'], at: ['near', 'mid', 'far'] },
  boat: { boat: ['shell', 'bark', 'raft'], cargo: ['one', 'two', 'three'] },
};

// ---------------------------------------------------------------------------------------------------------------------
// A guess: what will happen?
// ---------------------------------------------------------------------------------------------------------------------

/**
 * `setup` is the whole of what is shown; `happens` is what the row says it does. Every way it could turn out is
 * offered as a picture of that very set-up afterwards, and the one the row names is the answer.
 */
function guess({ lesson, bench, name, variant, setup, happens }) {
  const says = SAYS[bench];
  const outcomes = Object.keys(HAPPENS[bench]);
  const choices = outcomes.map((shown, index) => ({
    id: LETTERS[index],
    label: HAPPENS[bench][shown],
    stimulus: scene(bench, { ...setup, shown }),
  }));
  const at = outcomes.indexOf(happens);
  if (at < 0) throw new Error(`${lesson}.${name}: a ${bench} cannot be "${happens}".`);
  const answer = choices[at].id;
  const others = choices.filter((choice) => choice.id !== answer);
  // The first thing help takes away is the outcome furthest from what happens: the opposite one.
  const furthest = [...others].sort(
    (a, b) =>
      Math.abs(LETTERS.indexOf(b.id) - at) - Math.abs(LETTERS.indexOf(a.id) - at) ||
      LETTERS.indexOf(b.id) - LETTERS.indexOf(a.id),
  )[0];
  return {
    id: `${lesson}.${name}`,
    kind: 'choose-one',
    skillId: `engineering.${says}.predict`,
    variant,
    prompt: { instruction: `ii.${says}.predict.instruction`, stimulus: scene(bench, setup) },
    choices,
    answer,
    hints: [
      { type: 'model', caption: `ii.${says}.predict.hint.model` },
      ...(others.length > 1
        ? [{ type: 'eliminate', remove: [furthest.id], caption: 'ii.predict.hint.eliminate' }]
        : []),
      { type: 'reveal', caption: 'ii.predict.hint.reveal' },
    ],
    misconceptions: Object.fromEntries(
      others.map((choice) => [choice.id, `predicted-${choice.stimulus.of.shown}`]),
    ),
    feedback: { correct: `ii.${says}.is.${happens}`, incorrect: `ii.${says}.look.${happens}` },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// A mend: change it until it works
// ---------------------------------------------------------------------------------------------------------------------

/**
 * `fixed` is what cannot be changed; `start` is the design the child is handed, which does not work; `mended` is a
 * design that does, the one shown when the answer is shown. Only the parts named in `start` can be changed. A part
 * of the bench that is in neither has to be in `fixed`.
 */
function mend({ lesson, bench, name, variant, fixed, start, mended, options = {} }) {
  const says = bench === 'boat' ? 'float' : bench;
  const controls = Object.keys(PARTS[bench])
    .filter((id) => id in start)
    .map((id) => ({ id, options: options[id] ?? PARTS[bench][id] }));
  const given = { ...fixed, ...start };
  return {
    id: `${lesson}.${name}`,
    kind: 'make',
    skillId: `engineering.${says}.build`,
    variant,
    prompt: { instruction: `ii.${bench}.build.instruction`, stimulus: scene(bench, given) },
    task: {
      type: 'design',
      model: bench,
      given,
      controls,
      solution: controls.map((control) => mended[control.id]),
    },
    hints: [
      { type: 'model', caption: `ii.${bench}.build.hint.model` },
      // One part of the answer is worth giving only where there is more than one part.
      ...(controls.length > 1 ? [{ type: 'step', count: 1, caption: 'ii.build.hint.step' }] : []),
      { type: 'reveal', caption: 'ii.build.hint.reveal' },
    ],
    feedback: { correct: `ii.${bench}.build.correct`, incorrect: `ii.${bench}.build.incorrect` },
  };
}

function lesson({ id, says, title, summary, demo, guided, pool, count }) {
  return {
    id,
    version: 1,
    world: WORLD,
    title,
    summary,
    skillIds: [`engineering.${says}.predict`, `engineering.${says}.build`],
    estimatedMinutes: 4,
    plan: {
      demo: demo.map((challenge) => challenge.id),
      guided: guided.map((challenge) => challenge.id),
      independent: { pool: pool.map((challenge) => challenge.id), count, maxReprobes: 1 },
    },
    successCriteria: { independentFirstTryCorrect: count - 1 },
    challenges: [...demo, ...guided, ...pool],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Bridges that hold
// ---------------------------------------------------------------------------------------------------------------------

function bridges() {
  const id = 'ii-bridge-01';
  const will = (name, variant, [gap, traveller, plank, posts], happens) =>
    guess({
      lesson: id,
      bench: 'bridge',
      name,
      variant,
      setup: { gap, traveller, plank, posts },
      happens,
    });
  // Every bridge to mend starts as a thin plank on its own.
  const fix = (name, variant, [gap, traveller], [plank, posts]) =>
    mend({
      lesson: id,
      bench: 'bridge',
      name,
      variant,
      fixed: { gap, traveller },
      start: { plank: 'thin', posts: 'none' },
      mended: { plank, posts },
    });
  return lesson({
    id,
    says: 'bridge',
    title: 'Bridges that hold',
    summary:
      'A plank across a gap, and someone who wants to cross. Your child guesses whether it will hold and watches it tested, then mends a bridge that sags by changing the plank or standing posts under it.',
    demo: [
      will('demo-guess', 'thin-sags', [2, 'goat', 'thin', 'none'], 'sagged'),
      fix('demo-mend', 'one-part', [2, 'goat'], ['thick', 'none']),
    ],
    guided: [
      will('guided-guess', 'light-holds', [2, 'rabbit', 'thin', 'none'], 'held'),
      fix('guided-mend', 'one-part', [3, 'rabbit'], ['thin', 'one']),
    ],
    pool: [
      will('goat-thick-post', 'thick-and-post-holds', [3, 'goat', 'thick', 'one'], 'held'),
      will('goat-thick-alone', 'thick-alone-sags', [3, 'goat', 'thick', 'none'], 'sagged'),
      will('bear-one-post', 'heavy-sags', [2, 'bear', 'thin', 'one'], 'sagged'),
      will('rabbit-long-gap', 'post-holds-long', [4, 'rabbit', 'thin', 'one'], 'held'),
      fix('rabbit-wide', 'one-part', [4, 'rabbit'], ['thin', 'one']),
      fix('bear-narrow', 'one-part', [2, 'bear'], ['thin', 'two']),
      fix('goat-wide', 'both-parts', [4, 'goat'], ['thick', 'one']),
      fix('bear-middling', 'both-parts', [3, 'bear'], ['thick', 'two']),
    ],
    count: 3,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Ramps and rolling
// ---------------------------------------------------------------------------------------------------------------------

function ramps() {
  const id = 'ii-ramp-01';
  const will = (name, variant, [target, height, surface], happens) =>
    guess({
      lesson: id,
      bench: 'ramp',
      name,
      variant,
      setup: { target, height, surface },
      happens,
    });
  const fix = (name, variant, fixed, start, mended) =>
    mend({ lesson: id, bench: 'ramp', name, variant, fixed, start, mended });
  return lesson({
    id,
    says: 'ramp',
    title: 'Ramps and rolling',
    summary:
      'A ball rolls down a ramp and on along the ground. Your child guesses where it will stop, then makes it stop on the star by changing how high the ramp is and whether the ground is rough or smooth.',
    demo: [
      will('demo-guess', 'lands', [4, 'mid', 'smooth'], 'landed'),
      fix(
        'demo-mend',
        'height-only',
        { target: 6, surface: 'smooth' },
        { height: 'low' },
        { height: 'high' },
      ),
    ],
    guided: [
      will('guided-guess', 'too-low', [4, 'low', 'smooth'], 'rolled-short'),
      fix(
        'guided-mend',
        'height-only',
        { target: 2, surface: 'rough' },
        { height: 'low' },
        { height: 'mid' },
      ),
    ],
    pool: [
      will('high-on-smooth', 'too-high', [4, 'high', 'smooth'], 'rolled-past'),
      will('middle-on-rough', 'rough-slows', [4, 'mid', 'rough'], 'rolled-short'),
      will('high-on-rough', 'rough-lands', [3, 'high', 'rough'], 'landed'),
      will('low-on-smooth', 'low-lands', [2, 'low', 'smooth'], 'landed'),
      fix(
        'star-on-three',
        'one-part',
        { target: 3 },
        { height: 'low', surface: 'rough' },
        { height: 'high', surface: 'rough' },
      ),
      fix(
        'star-on-two',
        'one-part',
        { target: 2 },
        { height: 'high', surface: 'smooth' },
        { height: 'low', surface: 'smooth' },
      ),
      fix(
        'star-on-four',
        'both-parts',
        { target: 4 },
        { height: 'low', surface: 'rough' },
        { height: 'mid', surface: 'smooth' },
      ),
      fix(
        'star-on-six',
        'both-parts',
        { target: 6 },
        { height: 'low', surface: 'rough' },
        { height: 'high', surface: 'smooth' },
      ),
    ],
    count: 3,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Balancing
// ---------------------------------------------------------------------------------------------------------------------

function balances() {
  const id = 'ii-balance-01';
  const will = (name, variant, [leftWeight, leftAt, weight, at], happens) =>
    guess({
      lesson: id,
      bench: 'balance',
      name,
      variant,
      setup: { leftWeight, leftAt, weight, at },
      happens,
    });
  const fix = (name, variant, fixed, start, mended) =>
    mend({ lesson: id, bench: 'balance', name, variant, fixed, start, mended });
  const one = { weight: 'one', at: 'near' };
  return lesson({
    id,
    says: 'balance',
    title: 'Balancing',
    summary:
      'Blocks on a beam that rests on its middle. Your child guesses which way it will tip, then puts blocks on the other side to make it balance, and finds that one block far out can balance three close in.',
    demo: [
      will('demo-guess', 'mirror', [1, 2, 'one', 'mid'], 'balanced'),
      fix(
        'demo-mend',
        'place-only',
        { leftWeight: 1, leftAt: 3, weight: 'one' },
        { at: 'near' },
        { at: 'far' },
      ),
    ],
    guided: [
      will('guided-guess', 'more-blocks', [2, 2, 'one', 'mid'], 'tipped-left'),
      fix(
        'guided-mend',
        'place-only',
        { leftWeight: 1, leftAt: 2, weight: 'one' },
        { at: 'near' },
        { at: 'mid' },
      ),
    ],
    pool: [
      will('same-blocks-further-out', 'further-out', [1, 3, 'one', 'near'], 'tipped-left'),
      will('one-far-against-two-near', 'far-beats-more', [2, 1, 'one', 'far'], 'tipped-right'),
      will('one-far-against-three-near', 'far-balances-more', [1, 3, 'three', 'near'], 'balanced'),
      will('two-far-against-three-middle', 'far-balances-more', [3, 2, 'two', 'far'], 'balanced'),
      fix('two-close-in', 'one-part', { leftWeight: 2, leftAt: 1 }, one, {
        weight: 'two',
        at: 'near',
      }),
      fix('one-far-out', 'one-part', { leftWeight: 1, leftAt: 3 }, one, {
        weight: 'one',
        at: 'far',
      }),
      fix('two-far-out', 'both-parts', { leftWeight: 2, leftAt: 3 }, one, {
        weight: 'two',
        at: 'far',
      }),
      fix('three-in-the-middle', 'both-parts', { leftWeight: 3, leftAt: 2 }, one, {
        weight: 'three',
        at: 'mid',
      }),
    ],
    count: 3,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Float or sink
// ---------------------------------------------------------------------------------------------------------------------

function floats() {
  const id = 'ii-float-01';
  const drop = (name, variant, thing, happens) =>
    guess({ lesson: id, bench: 'tub', name, variant, setup: { thing }, happens });
  // A boat to guess about carries everything that is waiting, so that floating is the whole question.
  const launch = (name, variant, [boat, cargo, need], happens) =>
    guess({ lesson: id, bench: 'boat', name, variant, setup: { need, boat, cargo }, happens });
  // No more stones can be put aboard than are waiting.
  const loads = (need) => ['one', 'two', 'three'].slice(0, need);
  const fix = (name, variant, need, start, mended) =>
    mend({
      lesson: id,
      bench: 'boat',
      name,
      variant,
      fixed: { need, ...('cargo' in start ? {} : { cargo: loads(need).at(-1) }) },
      start,
      mended,
      options: { cargo: loads(need) },
    });
  return lesson({
    id,
    says: 'float',
    title: 'Float or sink',
    summary:
      'Things are dropped in a tub of water: your child guesses float or sink, and then sees. Big things can float and small things can sink; it is what a thing is made of that counts. Then stones, which sink, are carried across a pond in a boat that must not go under.',
    demo: [
      drop('demo-guess', 'big-floats', 'log', 'floated'),
      fix('demo-mend', 'boat-only', 2, { boat: 'shell' }, { boat: 'bark' }),
    ],
    guided: [
      drop('guided-guess', 'small-sinks', 'pebble', 'sank'),
      fix('guided-mend', 'boat-only', 3, { boat: 'shell' }, { boat: 'raft' }),
    ],
    pool: [
      drop('cork', 'small-floats', 'cork', 'floated'),
      drop('brick', 'big-sinks', 'brick', 'sank'),
      drop('wooden-spoon', 'wood-floats', 'wooden-spoon', 'floated'),
      drop('metal-spoon', 'metal-sinks', 'metal-spoon', 'sank'),
      drop('ball', 'big-floats', 'ball', 'floated'),
      drop('key', 'small-sinks', 'key', 'sank'),
      launch('bark-with-three', 'too-many-aboard', ['bark', 'three', 3], 'sank'),
      launch('raft-with-three', 'big-boat-carries', ['raft', 'three', 3], 'floated'),
      fix(
        'two-stones',
        'both-parts',
        2,
        { boat: 'shell', cargo: 'one' },
        { boat: 'bark', cargo: 'two' },
      ),
      fix(
        'three-stones',
        'both-parts',
        3,
        { boat: 'shell', cargo: 'one' },
        { boat: 'raft', cargo: 'three' },
      ),
      fix(
        'bark-too-small',
        'one-part',
        3,
        { boat: 'bark', cargo: 'three' },
        { boat: 'raft', cargo: 'three' },
      ),
      fix(
        'one-left-behind',
        'one-part',
        3,
        { boat: 'raft', cargo: 'two' },
        { boat: 'raft', cargo: 'three' },
      ),
    ],
    count: 4,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// The pack
// ---------------------------------------------------------------------------------------------------------------------

const skill = (says, kind, title, objective, prerequisites = []) => ({
  id: `engineering.${says}.${kind}`,
  world: WORLD,
  strand: 'engineering',
  title,
  objective,
  prerequisites,
});

const SKILLS = [
  skill(
    'bridge',
    'predict',
    'Guess whether a bridge will hold',
    'Looks at a plank bridge — how wide the gap, how thick the plank, how many posts, who is crossing — and says whether it will hold before it is tested.',
  ),
  skill(
    'bridge',
    'build',
    'Mend a bridge that sags',
    'Changes a bridge that sags, by a thicker plank or by posts, until it holds, testing after each change.',
    ['engineering.bridge.predict'],
  ),
  skill(
    'ramp',
    'predict',
    'Guess where a rolling ball will stop',
    'Looks at how high a ramp is and whether the ground is rough or smooth, and says whether the ball will stop short of the star, on it or past it.',
  ),
  skill(
    'ramp',
    'build',
    'Set a ramp so the ball stops on the star',
    'Changes the height of a ramp and the ground it rolls onto until the ball stops where it is wanted, testing after each change.',
    ['engineering.ramp.predict'],
  ),
  skill(
    'balance',
    'predict',
    'Guess which way a beam will tip',
    'Looks at how many blocks are on each side of a beam and how far out they are, and says which side will go down or that it will balance.',
  ),
  skill(
    'balance',
    'build',
    'Make a beam balance',
    'Places blocks on one side of a beam to balance the other, using both how many and how far out.',
    ['engineering.balance.predict'],
  ),
  skill(
    'float',
    'predict',
    'Guess what floats and what sinks',
    'Says whether a thing will float or sink before it is dropped in water, going by what it is made of and not by how big it is; and whether a loaded boat will float.',
  ),
  skill(
    'float',
    'build',
    'Choose a boat that carries the load',
    'Carries stones across a pond by choosing a boat big enough and loading it with all of them and no more than it can bear.',
    ['engineering.float.predict'],
  ),
];

const STRINGS = {
  'ii.predict.hint.eliminate': 'Not this one.',
  'ii.predict.hint.reveal': 'Let us test it. Watch.',
  'ii.build.hint.step': 'Here is one part. You choose the rest.',
  'ii.build.hint.reveal': 'Make it like this. Then test it.',

  'ii.bridge.predict.instruction': 'Will the bridge hold? What do you think?',
  'ii.bridge.predict.hint.model': 'Look at the plank. Look at the posts. Who is crossing?',
  'ii.bridge.is.held': 'Yes. It held.',
  'ii.bridge.is.sagged': 'Yes. It sags.',
  'ii.bridge.look.held': 'Look. It held. Tap what happened.',
  'ii.bridge.look.sagged': 'Look. It sags. Tap what happened.',
  'ii.bridge.build.instruction': 'This bridge sags. Change it so it holds.',
  'ii.bridge.build.correct': 'It holds! You mended it.',
  'ii.bridge.build.incorrect': 'It still sags. Change one thing and test again.',
  'ii.bridge.build.hint.model': 'A thick plank holds more. Posts hold it up.',

  'ii.ramp.predict.instruction': 'Where will the ball stop? What do you think?',
  'ii.ramp.predict.hint.model': 'How high is the ramp? Is the ground rough or smooth?',
  'ii.ramp.is.landed': 'Yes. It stopped on the star.',
  'ii.ramp.is.rolled-short': 'Yes. It stopped too soon.',
  'ii.ramp.is.rolled-past': 'Yes. It rolled too far.',
  'ii.ramp.look.landed': 'Look. It stopped on the star. Tap what happened.',
  'ii.ramp.look.rolled-short': 'Look. It stopped too soon. Tap what happened.',
  'ii.ramp.look.rolled-past': 'Look. It rolled too far. Tap what happened.',
  'ii.ramp.build.instruction': 'Make the ball stop on the star.',
  'ii.ramp.build.correct': 'It stopped on the star!',
  'ii.ramp.build.incorrect': 'Not on the star yet. Change one thing and test again.',
  'ii.ramp.build.hint.model': 'A higher ramp rolls it further. Rough ground slows it down.',

  'ii.balance.predict.instruction': 'Which way will it tip? What do you think?',
  'ii.balance.predict.hint.model': 'Count the blocks. Look how far out they are.',
  'ii.balance.is.balanced': 'Yes. It balanced.',
  'ii.balance.is.tipped-left': 'Yes. The blue side went down.',
  'ii.balance.is.tipped-right': 'Yes. The orange side went down.',
  'ii.balance.look.balanced': 'Look. It balanced. Tap what happened.',
  'ii.balance.look.tipped-left': 'Look. The blue side went down. Tap what happened.',
  'ii.balance.look.tipped-right': 'Look. The orange side went down. Tap what happened.',
  'ii.balance.build.instruction': 'Make it balance.',
  'ii.balance.build.correct': 'It balances!',
  'ii.balance.build.incorrect': 'It is still tipping. Change one thing and test again.',
  'ii.balance.build.hint.model': 'Further out pushes down more. More blocks push down more.',

  'ii.float.predict.instruction': 'Will it float or sink? What do you think?',
  'ii.float.predict.hint.model': 'What is it made of? Big things can float. Small things can sink.',
  'ii.float.is.floated': 'Yes. It floats.',
  'ii.float.is.sank': 'Yes. It sank.',
  'ii.float.look.floated': 'Look. It floats. Tap what happened.',
  'ii.float.look.sank': 'Look. It sank. Tap what happened.',
  'ii.boat.build.instruction': 'Take all the stones across. Do not let the boat sink.',
  'ii.boat.build.correct': 'They all got across!',
  'ii.boat.build.incorrect': 'Not yet. Change one thing and test again.',
  'ii.boat.build.hint.model': 'A bigger boat can carry more. Too many stones and it sinks.',
};

export function buildInventorIslandPack() {
  return {
    format: 'training-academy.content-pack',
    schemaVersion: 1,
    id: WORLD,
    world: WORLD,
    contentVersion: 1,
    strings: { en: STRINGS },
    skills: SKILLS,
    lessons: [bridges(), ramps(), balances(), floats()],
  };
}
