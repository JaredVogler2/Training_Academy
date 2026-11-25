// The Music Lab's content pack, written from tables.
//
//   high and low                 two or three notes, one after another: which was the high one?   (pitch)
//   the same, or different?      two short tunes, or two drum patterns: were they the same?       (patterns)
//   tapping with the beat        a slow, steady beat, and a drum to tap along on                  (rough tempo)
//   play it back                 two to four notes on chime bars, to be played back in order      (order)
//   the same tune again          a tune, and then two or three more: which one was it again?      (repetition)
//   make a tune                  chime bars, and a shape to give a tune: up, down, a hill, home   (making)
//
// Nobody has to read music, and nobody has to have "an ear": every sound can be heard again for the asking, the
// first questions are far apart (two octaves, up against down), and only later ones are close. What is written
// down about a child is what was actually asked of them — which note they chose, what order they played, whether
// their tapping kept roughly to the beat — and never anything called talent.
//
// Every phrase here was made up for this game: steps and skips of two to four notes, nothing taken from a song.
// The sounds are made by the game as it runs (src/audio/audioEngine.ts); there are no recordings of instruments.

const LETTERS = ['a', 'b', 'c'];
const SEMITONES = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const pitchOf = (note) => 12 * (Number(note[1]) + 1) + SEMITONES[note[0]];
const NUMBER = ['', 'one', 'two', 'three', 'four', 'five', 'six'];

const sign = (id) => ({ type: 'sign', id });
const scene = (name, of) => ({ type: 'scene', scene: name, of });
const bar = (note) => scene('bar', { note });

/** Someone with something to play: notes on a pipe or on bars, or long and short knocks on a drum. */
function phrase(voice, played, big = false) {
  const of = voice === 'drum' ? { voice, steps: played } : { voice, notes: played };
  return scene('phrase', big ? { ...of, big: true } : of);
}

const NOTE_NAMES = { c: 'C', d: 'D', e: 'E', f: 'F', g: 'G', a: 'A', b: 'B' };
/** A note in words a grown-up can read out: "low C", "high C", "middle E". */
function noteWord(note) {
  const octave = Number(note[1]);
  const where = octave <= 3 ? 'low ' : octave === 4 ? '' : octave === 5 ? 'high ' : 'very high ';
  return `${where}${NOTE_NAMES[note[0]]}`;
}
const playedWords = (voice, played) =>
  voice === 'drum'
    ? played.map((step) => (step === 1 ? 'short' : 'long')).join(', ')
    : played.map(noteWord).join(', ');

function lesson({
  id,
  version = 1,
  title,
  summary,
  minutes = 3,
  needsSound,
  demo,
  guided,
  pool,
  count,
}) {
  return {
    id,
    version,
    world: 'music-lab',
    title,
    summary,
    skillIds: [...new Set([...demo, ...guided, ...pool].map((challenge) => challenge.skillId))],
    estimatedMinutes: minutes,
    ...(needsSound ? { needsSound: true } : {}),
    plan: {
      demo: demo.map((challenge) => challenge.id),
      guided: guided.map((challenge) => challenge.id),
      independent: {
        pool: pool.map((challenge) => challenge.id),
        count,
        maxReprobes: Math.min(1, pool.length - count),
      },
    },
    successCriteria: { independentFirstTryCorrect: count - 1 },
    challenges: [...demo, ...guided, ...pool],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// High and low
// ---------------------------------------------------------------------------------------------------------------------

function highLowLesson() {
  const id = 'ml-high-low-01';
  const skillId = 'music.pitch.high-low';
  // [name, what is asked for, how they look, the notes]. With `bars` the notes are played on chime bars, where
  // the high one can be seen to be the small one; with `birds` they are sung by birds that all look alike.
  const row = ([name, asked, look, ...notes]) => {
    const pitches = notes.map(pitchOf);
    const wanted = asked === 'high' ? Math.max(...pitches) : Math.min(...pitches);
    const other = asked === 'high' ? Math.min(...pitches) : Math.max(...pitches);
    const choices = notes.map((note, index) => ({
      id: LETTERS[index],
      label: `${look === 'bars' ? 'A chime bar' : 'A bird'}: ${noteWord(note)}`,
      stimulus: look === 'bars' ? bar(note) : phrase('pipe', [note]),
    }));
    const answer = choices[pitches.indexOf(wanted)].id;
    const distractors = choices.filter((choice) => choice.id !== answer);
    const gap = Math.abs(wanted - other);
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId,
      variant:
        notes.length === 3
          ? `${asked}-of-three`
          : `${asked}-${gap >= 12 ? 'far-apart' : gap >= 5 ? 'apart' : 'close'}`,
      prompt: { instruction: `ml.hl.${asked}.instruction`, stimulus: sign(asked) },
      choices,
      answer,
      hints: [
        { type: 'model', caption: 'ml.hl.hint.model' },
        ...(distractors.length > 1
          ? [{ type: 'eliminate', remove: [distractors.at(-1).id], caption: 'ml.hint.not-this' }]
          : []),
        { type: 'reveal', caption: `ml.hl.${asked}.reveal` },
      ],
      misconceptions: Object.fromEntries(
        distractors.map((choice) => {
          const pitch = pitches[LETTERS.indexOf(choice.id)];
          return [
            choice.id,
            pitch === other
              ? asked === 'high'
                ? 'picked-the-low-one'
                : 'picked-the-high-one'
              : 'picked-the-middle-one',
          ];
        }),
      ),
      feedback: { correct: `ml.hl.${asked}.correct`, incorrect: 'ml.hl.incorrect' },
    };
  };
  return lesson({
    id,
    title: 'High and low',
    summary:
      'Two notes are played, and your child taps the one that was high — or, when asked, the one that was low. First they are on chime bars, where the small bar can be seen to be the high one, and far apart. Later birds that look alike sing them, closer together, so that only listening will do.',
    needsSound: true,
    demo: [
      ['demo-high', 'high', 'bars', 'c4', 'c6'],
      ['demo-low', 'low', 'bars', 'c6', 'c4'],
    ].map(row),
    guided: [
      ['guided-high', 'high', 'bars', 'e6', 'e4'],
      ['guided-low', 'low', 'bars', 'g5', 'c4'],
      ['guided-birds', 'high', 'birds', 'd4', 'd6'],
    ].map(row),
    pool: [
      ['high-octave', 'high', 'birds', 'e4', 'e5'],
      ['low-octave', 'low', 'birds', 'd5', 'd4'],
      ['high-fifth', 'high', 'birds', 'd5', 'g4'],
      ['low-fifth', 'low', 'birds', 'a5', 'd5'],
      ['high-third', 'high', 'birds', 'c5', 'e5'],
      ['low-third', 'low', 'birds', 'e5', 'g5'],
      ['high-of-three', 'high', 'birds', 'c5', 'g4', 'e5'],
      ['low-of-three', 'low', 'birds', 'a4', 'f5', 'c5'],
    ].map(row),
    count: 4,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// The same, or different?
// ---------------------------------------------------------------------------------------------------------------------

function sameLesson() {
  const id = 'ml-same-01';
  const skillId = 'music.pattern.same-different';
  const row = ([name, voice, first, second]) => {
    const same = JSON.stringify(first) === JSON.stringify(second);
    const answer = same ? 'same' : 'different';
    const of =
      voice === 'drum'
        ? { voice, firstSteps: first, secondSteps: second }
        : { voice, first, second };
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId,
      variant: `${voice === 'drum' ? 'drum' : 'tune'}-${answer}`,
      prompt: { instruction: 'ml.same.instruction', stimulus: scene('pair', of) },
      choices: [
        { id: 'same', label: 'The same', stimulus: sign('same') },
        { id: 'different', label: 'Different', stimulus: sign('different') },
      ],
      answer,
      hints: [
        { type: 'model', caption: 'ml.same.hint.model' },
        { type: 'reveal', caption: `ml.same.${answer}.reveal` },
      ],
      misconceptions: same
        ? { different: 'heard-a-difference' }
        : { same: 'missed-the-difference' },
      feedback: { correct: `ml.same.${answer}.correct`, incorrect: 'ml.same.incorrect' },
    };
  };
  return lesson({
    id,
    title: 'The same, or different?',
    summary:
      'Two birds sing a short tune each — or two drums play a short pattern each — and your child says whether the two were the same or different. The first differences are big ones: a tune that goes up against one that comes down. Later only one note, or one long knock, is changed.',
    needsSound: true,
    demo: [
      ['demo-same', 'pipe', ['c5', 'e5', 'g5'], ['c5', 'e5', 'g5']],
      ['demo-different', 'pipe', ['c5', 'e5', 'g5'], ['g5', 'e5', 'c5']],
    ].map(row),
    guided: [
      ['guided-different', 'pipe', ['e5', 'g5'], ['e5', 'c5']],
      ['guided-same', 'pipe', ['g5', 'd5', 'e5'], ['g5', 'd5', 'e5']],
      ['guided-drum', 'drum', [2, 2, 2], [1, 1, 2]],
    ].map(row),
    pool: [
      ['tune-same-three', 'pipe', ['d5', 'f5', 'a5'], ['d5', 'f5', 'a5']],
      ['tune-different-end', 'pipe', ['c5', 'd5', 'e5'], ['c5', 'd5', 'c5']],
      ['tune-same-four', 'pipe', ['e5', 'd5', 'g5', 'e5'], ['e5', 'd5', 'g5', 'e5']],
      ['tune-different-middle', 'pipe', ['g5', 'e5', 'g5'], ['g5', 'a5', 'g5']],
      ['bars-same', 'bar', ['c4', 'g4', 'e4'], ['c4', 'g4', 'e4']],
      ['bars-different-start', 'bar', ['e4', 'g4', 'a4'], ['c4', 'g4', 'a4']],
      ['drum-same', 'drum', [1, 1, 2, 2], [1, 1, 2, 2]],
      ['drum-different', 'drum', [2, 1, 1, 2], [1, 1, 2, 2]],
    ].map(row),
    count: 4,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Tapping with the beat
// ---------------------------------------------------------------------------------------------------------------------

function beatLesson() {
  const id = 'ml-beat-01';
  const skillId = 'music.rhythm.steady-beat';
  const row = ([name, tempo, beats, need]) => ({
    id: `${id}.${name}`,
    kind: 'make',
    skillId,
    variant: tempo <= 63 ? 'slow' : tempo <= 72 ? 'steady' : 'brisk',
    prompt: { instruction: 'ml.beat.instruction', stimulus: scene('beat', { tempo, beats }) },
    task: { type: 'beat', tempo, lead: 4, beats, need },
    hints: [
      { type: 'model', caption: 'ml.beat.hint.model' },
      { type: 'reveal', caption: 'ml.beat.hint.reveal' },
    ],
    maxTries: 3,
    feedback: { correct: 'ml.beat.correct', incorrect: 'ml.beat.incorrect' },
  });
  return lesson({
    id,
    title: 'Tapping with the beat',
    summary:
      'A slow, steady beat is played and lit up along a strip: four beats to listen to, then some to join in with on a big drum. Nothing has to be exact. Most of the beats met, give or take a good margin, is keeping the beat, and a tablet that answers a little late is allowed for.',
    demo: [['demo', 66, 4, 3]].map(row),
    guided: [
      ['guided-slow', 60, 6, 4],
      ['guided-steady', 66, 8, 5],
    ].map(row),
    pool: [
      ['slow-a', 60, 8, 6],
      ['slow-b', 63, 8, 6],
      ['steady-a', 69, 8, 6],
      ['steady-b', 72, 8, 6],
      ['brisk-a', 80, 8, 6],
      ['brisk-b', 84, 8, 6],
    ].map(row),
    count: 3,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Play it back
// ---------------------------------------------------------------------------------------------------------------------

const THREE_BARS = ['c4', 'e4', 'g4'];
const FOUR_BARS = ['c4', 'd4', 'e4', 'g4'];
const FIVE_BARS = ['c4', 'd4', 'e4', 'g4', 'a4'];
/** Five again, with the C above in place of the D: for a tune that climbs the whole octave. (Never six: on a screen
 * 320 points wide a sixth bar leaves each of them narrower than a small finger needs.) */
const OCTAVE_BARS = ['c4', 'e4', 'g4', 'a4', 'c5'];

const barCard = (note) => ({
  id: note,
  label: `Chime bar: ${noteWord(note)}`,
  stimulus: bar(note),
});

function echoLesson() {
  const id = 'ml-echo-01';
  const skillId = 'music.memory.play-back';
  const row = ([name, bars, ...sequence]) => ({
    id: `${id}.${name}`,
    kind: 'make',
    skillId,
    variant: `${NUMBER[sequence.length]}-notes`,
    prompt: { instruction: 'ml.echo.instruction' },
    task: { type: 'echo', cards: bars.map(barCard), solution: sequence },
    hints: [
      { type: 'model', caption: 'ml.echo.hint.model' },
      { type: 'step', count: 1, caption: 'ml.echo.hint.step' },
      { type: 'reveal', caption: 'ml.echo.hint.reveal' },
    ],
    feedback: { correct: 'ml.echo.correct', incorrect: 'ml.echo.incorrect' },
  });
  return lesson({
    id,
    title: 'Play it back',
    summary:
      'A few notes are played on chime bars, each bar lighting as it sounds, and your child plays them back in the same order: two notes at first, then three, then four. Hearing the notes again is help, and is asked for as help. With the sound off the bars still light, so the order can be followed by eye.',
    demo: [['demo', THREE_BARS, 'c4', 'g4']].map(row),
    guided: [
      ['guided-two', THREE_BARS, 'g4', 'e4'],
      ['guided-three', THREE_BARS, 'e4', 'c4', 'g4'],
    ].map(row),
    pool: [
      ['three-a', THREE_BARS, 'g4', 'c4', 'e4'],
      ['three-b', FOUR_BARS, 'd4', 'g4', 'e4'],
      ['three-c', FOUR_BARS, 'e4', 'e4', 'c4'],
      ['three-d', FIVE_BARS, 'a4', 'e4', 'g4'],
      ['four-a', FOUR_BARS, 'c4', 'e4', 'd4', 'g4'],
      ['four-b', FIVE_BARS, 'g4', 'a4', 'e4', 'c4'],
      ['four-c', FIVE_BARS, 'd4', 'd4', 'a4', 'g4'],
      ['four-d', FIVE_BARS, 'e4', 'g4', 'c4', 'd4'],
    ].map(row),
    count: 4,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// The same tune again
// ---------------------------------------------------------------------------------------------------------------------

function againLesson() {
  const id = 'ml-again-01';
  const skillId = 'music.pattern.repeated-phrase';
  const sorted = (played) => JSON.stringify([...played].sort());
  const row = ([name, voice, first, ...others]) => {
    const choices = others.map((played, index) => ({
      id: LETTERS[index],
      label: `${voice === 'drum' ? 'A little drum' : 'A little bird'}: ${playedWords(voice, played)}`,
      stimulus: phrase(voice, played),
    }));
    const same = (played) => JSON.stringify(played) === JSON.stringify(first);
    const answer = choices[others.findIndex(same)].id;
    const distractors = choices.filter((choice) => choice.id !== answer);
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId,
      variant: voice === 'drum' ? 'drums' : `${NUMBER[others.length]}-singers`,
      prompt: {
        instruction: `ml.again.${voice === 'drum' ? 'drum' : 'tune'}.instruction`,
        stimulus: phrase(voice, first, true),
      },
      choices,
      answer,
      hints: [
        { type: 'model', caption: 'ml.again.hint.model' },
        ...(distractors.length > 1
          ? [{ type: 'eliminate', remove: [distractors.at(-1).id], caption: 'ml.hint.not-this' }]
          : []),
        { type: 'reveal', caption: 'ml.again.hint.reveal' },
      ],
      misconceptions: Object.fromEntries(
        distractors.map((choice) => {
          const played = others[LETTERS.indexOf(choice.id)];
          return [
            choice.id,
            sorted(played) === sorted(first) ? 'same-things-other-order' : 'one-thing-changed',
          ];
        }),
      ),
      feedback: { correct: 'ml.again.correct', incorrect: 'ml.again.incorrect' },
    };
  };
  return lesson({
    id,
    title: 'The same tune again',
    summary:
      'A big bird sings a short tune. Then two or three little birds sing one each, and your child finds the one that sang the big bird’s tune again. The others are nearly the same: the same notes in another order, or one note changed. Some questions are for drums, with long and short knocks.',
    minutes: 4,
    needsSound: true,
    demo: [['demo', 'pipe', ['c5', 'g5'], ['c5', 'g5'], ['g5', 'c5']]].map(row),
    guided: [
      ['guided-two', 'pipe', ['g5', 'e5', 'g5'], ['g5', 'e5', 'c5'], ['g5', 'e5', 'g5']],
      [
        'guided-three',
        'pipe',
        ['c5', 'd5', 'e5'],
        ['c5', 'd5', 'e5'],
        ['e5', 'd5', 'c5'],
        ['c5', 'e5', 'd5'],
      ],
    ].map(row),
    pool: [
      ['two-a', 'pipe', ['e5', 'g5', 'e5'], ['e5', 'g5', 'a5'], ['e5', 'g5', 'e5']],
      [
        'two-b',
        'pipe',
        ['d5', 'f5', 'd5', 'a5'],
        ['d5', 'f5', 'd5', 'a5'],
        ['d5', 'f5', 'a5', 'd5'],
      ],
      [
        'two-c',
        'bar',
        ['c4', 'e4', 'g4', 'e4'],
        ['c4', 'e4', 'g4', 'e4'],
        ['c4', 'e4', 'g4', 'c4'],
      ],
      [
        'three-a',
        'pipe',
        ['a5', 'g5', 'e5'],
        ['a5', 'e5', 'g5'],
        ['a5', 'g5', 'e5'],
        ['e5', 'g5', 'a5'],
      ],
      [
        'three-b',
        'pipe',
        ['c5', 'c5', 'g5'],
        ['c5', 'g5', 'g5'],
        ['g5', 'c5', 'c5'],
        ['c5', 'c5', 'g5'],
      ],
      [
        'three-c',
        'bar',
        ['g4', 'd4', 'e4'],
        ['g4', 'e4', 'd4'],
        ['d4', 'g4', 'e4'],
        ['g4', 'd4', 'e4'],
      ],
      ['drums-a', 'drum', [2, 1, 1], [1, 1, 2], [2, 1, 1]],
      ['drums-b', 'drum', [1, 1, 2, 2], [1, 1, 2, 2], [2, 2, 1, 1], [1, 2, 1, 2]],
    ].map(row),
    count: 4,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Make a tune
// ---------------------------------------------------------------------------------------------------------------------

function tuneLesson() {
  const id = 'ml-tune-01';
  const skillId = 'music.making.shape-a-tune';
  const row = ([name, shape, notes, ...solution]) => ({
    id: `${id}.${name}`,
    kind: 'make',
    skillId,
    variant: shape,
    prompt: { instruction: `ml.tune.${shape}.instruction`, stimulus: sign(shape) },
    task: { type: 'tune', notes, length: solution.length, shape, solution },
    hints: [
      { type: 'model', caption: `ml.tune.${shape}.hint` },
      { type: 'step', count: shape === 'twice' ? 2 : 1, caption: 'ml.tune.hint.step' },
      { type: 'reveal', caption: 'ml.tune.hint.reveal' },
    ],
    maxTries: 3,
    feedback: { correct: 'ml.tune.correct', incorrect: `ml.tune.${shape}.incorrect` },
  });
  return lesson({
    id,
    // The second version: three of its tunes were first written for six bars, which are too narrow to be a fair
    // target on a small phone, and went live that way before they were changed to five.
    version: 2,
    title: 'Make a tune',
    summary:
      'Chime bars, and a tune to make up with a shape to it: going up, coming down, over a hill and back, the same thing twice, or home to the biggest bar. There are many right tunes, and your child’s own is as right as any. It can be played back and changed before saying it is done.',
    minutes: 4,
    demo: [['demo', 'up', ['c4', 'e4', 'g4', 'c5'], 'c4', 'e4', 'g4']].map(row),
    guided: [
      ['guided-up', 'up', FIVE_BARS, 'c4', 'e4', 'a4'],
      ['guided-down', 'down', FIVE_BARS, 'a4', 'e4', 'c4'],
    ].map(row),
    pool: [
      ['up-four', 'up', OCTAVE_BARS, 'c4', 'e4', 'g4', 'c5'],
      ['down-four', 'down', OCTAVE_BARS, 'c5', 'a4', 'e4', 'c4'],
      ['hill-three', 'hill', FIVE_BARS, 'd4', 'a4', 'e4'],
      ['hill-five', 'hill', FIVE_BARS, 'c4', 'e4', 'a4', 'g4', 'd4'],
      ['twice-four', 'twice', FIVE_BARS, 'e4', 'g4', 'e4', 'g4'],
      ['twice-six', 'twice', FIVE_BARS, 'c4', 'e4', 'g4', 'c4', 'e4', 'g4'],
      ['home-four', 'home', FIVE_BARS, 'e4', 'a4', 'g4', 'c4'],
      ['home-five', 'home', FIVE_BARS, 'g4', 'a4', 'e4', 'd4', 'c4'],
    ].map(row),
    count: 4,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// The pack
// ---------------------------------------------------------------------------------------------------------------------

const skill = (id, title, objective, prerequisites) => ({
  id,
  world: 'music-lab',
  strand: 'music',
  title,
  objective,
  prerequisites,
});

const SKILLS = [
  skill(
    'music.pitch.high-low',
    'Tell a high note from a low one',
    'Hears two or three notes sung by birds that look alike, and taps the one that was high — or, when asked, the one that was low — when the notes are as little as a third apart.',
    [],
  ),
  skill(
    'music.pattern.same-different',
    'Say whether two short tunes are the same',
    'Hears two tunes of three or four notes, or two drum patterns, one after the other, and says whether they were the same or different when only one note or one knock is changed.',
    ['music.pitch.high-low'],
  ),
  skill(
    'music.rhythm.steady-beat',
    'Tap along with a slow, steady beat',
    'Taps a drum in time with a beat of 60 to 84 to the minute, meeting at least six beats of eight within a generous margin. This is rough tempo, not precision.',
    [],
  ),
  skill(
    'music.memory.play-back',
    'Play back a few notes in order',
    'Hears three or four notes played on chime bars and plays them back in the same order.',
    ['music.pitch.high-low'],
  ),
  skill(
    'music.pattern.repeated-phrase',
    'Know a tune again when it comes back',
    'Hears a tune of three or four notes and then two or three more, and picks out the one that was the first tune again from others with the same notes in another order.',
    ['music.pattern.same-different'],
  ),
  skill(
    'music.making.shape-a-tune',
    'Make up a tune with a shape',
    'Makes up a tune of three to six notes on chime bars that goes up, goes down, climbs and comes back, says the same thing twice, or comes home to the lowest bar, as asked.',
    ['music.memory.play-back'],
  ),
];

const STRINGS = {
  'ml.hint.not-this': 'Not this one.',
  'ml.hl.high.instruction': 'Listen. Which one is high?',
  'ml.hl.low.instruction': 'Listen. Which one is low?',
  'ml.hl.high.correct': 'Yes. That one is high.',
  'ml.hl.low.correct': 'Yes. That one is low.',
  'ml.hl.incorrect': 'Not that one. Listen again.',
  'ml.hl.hint.model': 'High sounds are thin and squeaky. Low sounds are deep.',
  'ml.hl.high.reveal': 'This one is high.',
  'ml.hl.low.reveal': 'This one is low.',
  'ml.same.instruction': 'Listen to them both. Are they the same?',
  'ml.same.same.correct': 'Yes. They are the same.',
  'ml.same.different.correct': 'Yes. They are different.',
  'ml.same.incorrect': 'Listen once more.',
  'ml.same.hint.model': 'Listen to the first one. Then listen to the second one.',
  'ml.same.same.reveal': 'They are the same.',
  'ml.same.different.reveal': 'They are different.',
  'ml.beat.instruction': 'Listen to the beat. Then tap the drum with it.',
  'ml.beat.correct': 'Yes. You kept the beat.',
  'ml.beat.incorrect': 'Not quite with the beat. Listen, and try again.',
  'ml.beat.hint.model': 'Listen first. Then tap each time the light comes on.',
  'ml.beat.hint.reveal': 'Tap when I tap.',
  'ml.echo.instruction': 'Listen. Then play it back.',
  'ml.echo.correct': 'Yes. You played it back.',
  'ml.echo.incorrect': 'Not quite. Listen again.',
  'ml.echo.hint.model': 'Here it is again.',
  'ml.echo.hint.step': 'It starts like this.',
  'ml.echo.hint.reveal': 'Play them as I point.',
  'ml.again.tune.instruction': 'Listen to the big bird. Who sings the same tune?',
  'ml.again.drum.instruction': 'Listen to the big drum. Who plays the same?',
  'ml.again.correct': 'Yes. The same again.',
  'ml.again.incorrect': 'That one was different. Listen again.',
  'ml.again.hint.model': 'Listen to the big one. Then listen to each little one.',
  'ml.again.hint.reveal': 'This one is the same.',
  'ml.tune.up.instruction': 'Make a tune that goes up.',
  'ml.tune.down.instruction': 'Make a tune that goes down.',
  'ml.tune.hill.instruction': 'Make a tune that goes up, and then comes down.',
  'ml.tune.twice.instruction': 'Make a little tune. Then play the same again.',
  'ml.tune.home.instruction': 'Make a tune that ends on the biggest bar.',
  'ml.tune.up.incorrect': 'That did not go up every time. Change it, and try again.',
  'ml.tune.down.incorrect': 'That did not go down every time. Change it, and try again.',
  'ml.tune.hill.incorrect': 'Go up first. Then come down.',
  'ml.tune.twice.incorrect': 'The second half has to be the same as the first.',
  'ml.tune.home.incorrect': 'It has to end on the biggest bar.',
  'ml.tune.up.hint': 'Start on a big bar. Then choose a smaller one each time.',
  'ml.tune.down.hint': 'Start on a small bar. Then choose a bigger one each time.',
  'ml.tune.hill.hint': 'Go to smaller bars first. Then come back to bigger ones.',
  'ml.tune.twice.hint': 'Choose two bars. Then choose the same two again.',
  'ml.tune.home.hint': 'Play any bars you like. Play the biggest bar last.',
  'ml.tune.hint.step': 'Start like this.',
  'ml.tune.hint.reveal': 'Here is one way.',
  'ml.tune.correct': 'Yes. Listen to your tune.',
};

export function buildMusicLabPack() {
  return {
    format: 'training-academy.content-pack',
    schemaVersion: 1,
    id: 'music-lab',
    world: 'music-lab',
    contentVersion: 2,
    strings: { en: STRINGS },
    skills: SKILLS,
    lessons: [
      highLowLesson(),
      sameLesson(),
      beatLesson(),
      echoLesson(),
      againLesson(),
      tuneLesson(),
    ],
  };
}
