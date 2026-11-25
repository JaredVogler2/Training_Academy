import { describe, expect, it } from 'vitest';
import readingCove from '@/content/packs/reading-cove.v2.json';
import {
  parseContentPack,
  type ChooseOneChallenge,
  type Lesson,
  type MakeChallenge,
  type Stage,
} from '@/engine';
import type { ChooseSituation, Script, ScriptEvent } from '@/game/lesson/script';
import { CLAP_GAP, hasMarks, marksOf } from '@/game/worlds/reading-cove/clips';
import {
  chooseScript,
  keywordFor,
  linesFor,
  makeScript,
  soundOf,
} from '@/game/worlds/reading-cove/script';
import manifest from '@/voice/manifest.json';
import marks from '@/voice/marks/reading-cove.json';

/**
 * What Reading Cove says, and to whom. The difference between a step with support and a step alone is almost all
 * in what is said aloud, so that is what these tests pin down: a letter shown alone gets no word, a word to read
 * alone is not read out.
 */

const parsed = parseContentPack(readingCove);
if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
const pack = parsed.value;

function challenge(id: string): ChooseOneChallenge {
  for (const lesson of pack.lessons) {
    const found = lesson.challenges.find((each) => each.id === id);
    if (found?.kind === 'choose-one') return found;
  }
  throw new Error(`No question called ${id}.`);
}

function lessonOf(id: string): Lesson {
  const found = pack.lessons.find((lesson) => lesson.id === id);
  if (!found) throw new Error(`No lesson called ${id}.`);
  return found;
}

function situation(
  id: string,
  stage: Stage,
  event: ScriptEvent = 'new',
  extra: Partial<ChooseSituation> = {},
): ChooseSituation {
  const asked = challenge(id);
  const answer = asked.choices.find((choice) => choice.id === asked.answer)!;
  const shows = stage === 'demo' || event === 'correct' || event === 'hint-reveal';
  return {
    stage,
    event,
    prompt: asked.prompt.stimulus,
    glance: false,
    again: false,
    choices: asked.choices.map((choice) => ({ id: choice.id, stimulus: choice.stimulus })),
    answer: shows ? { id: answer.id, stimulus: answer.stimulus } : null,
    tried: null,
    revealed: false,
    lines: { instruction: asked.prompt.instruction, feedback: 'feedback', hint: 'hint' },
    seconds: () => 1,
    ...extra,
  };
}

const said = (script: Script): string[] =>
  script.moments.flatMap((moment) => (moment.sound?.kind === 'say' ? [moment.sound.key] : []));

describe('a letter and its word', () => {
  it('has a word for every letter taught, and another when that one is already on the table', () => {
    expect(keywordFor('s')).toBe('sun');
    expect(keywordFor('s', ['sun'])).toBe('sock');
    expect(keywordFor('u')).toBe('umbrella');
    // Only one word starts with u: it is used even when it is on the table.
    expect(keywordFor('u', ['umbrella'])).toBe('umbrella');
    expect(keywordFor('z')).toBeNull();
  });
});

describe('which one starts the same?', () => {
  const id = 'rc-first-01.sock';

  it('says the word that is asked about with its first sound drawn out', () => {
    expect(said(chooseScript(situation(id, 'independent')))).toContain('onset.sock');
  });

  it('names the choices plainly to a child on their own, and drawn out with support', () => {
    const alone = said(chooseScript(situation(id, 'independent')));
    expect(alone).toEqual(expect.arrayContaining(['word.seed', 'word.mug', 'word.fin']));
    expect(alone).not.toContain('onset.seed');
    const supported = said(chooseScript(situation(id, 'guided')));
    expect(supported).toEqual(expect.arrayContaining(['onset.seed', 'onset.mug', 'onset.fin']));
  });

  it('after a wrong answer says what was picked and then what was asked about: they start differently', () => {
    const tried = challenge(id).choices.find((choice) => choice.label === 'mug')!;
    const script = chooseScript(
      situation(id, 'independent', 'incorrect', {
        tried: { id: tried.id, stimulus: tried.stimulus },
      }),
    );
    const order = said(script);
    expect(order.indexOf('onset.mug')).toBeGreaterThan(-1);
    expect(order.indexOf('onset.sock')).toBeGreaterThan(order.indexOf('onset.mug'));
  });
});

describe('a letter shown, and the picture that starts with its sound', () => {
  const id = 'rc-letters-01.s-picture';

  it('gives the letter a word with support, and no word at all to a child on their own', () => {
    const supported = said(chooseScript(situation(id, 'guided')));
    // Soap is on the table, so the letter's word is another one that starts with s.
    expect(supported).toContain('onset.sun');
    const alone = said(chooseScript(situation(id, 'independent')));
    expect(alone.filter((key) => key.startsWith('onset.'))).toEqual([]);
    // The pictures are still named: knowing what a picture is called is not what is being asked.
    expect(alone).toEqual(expect.arrayContaining(['word.soap', 'word.axe', 'word.mat']));
  });

  it('says the letter’s word when help is asked for', () => {
    expect(said(chooseScript(situation(id, 'independent', 'hint-model')))).toContain('onset.sun');
  });

  it('meets each new letter with a word in the demonstration', () => {
    const script = chooseScript(situation('rc-letters-01.meet-m', 'demo'));
    // Moon is on the table as the answer, so the letter is first given another of its words.
    expect(said(script)).toEqual(['lesson.watch', 'rc.letters.meet', 'onset.mat', 'onset.moon']);
  });
});

describe('a picture shown, and the letter it starts with', () => {
  const id = 'rc-letters-01.seed-letter';

  it('sounds no letter for a child on their own', () => {
    const alone = said(chooseScript(situation(id, 'independent')));
    expect(alone).toEqual(['rc.letters.letter.instruction', 'onset.seed']);
  });

  it('gives each letter its word with support', () => {
    const supported = said(chooseScript(situation(id, 'guided')));
    expect(supported).toEqual(expect.arrayContaining(['onset.moon', 'onset.sun', 'word.tap']));
  });
});

describe('a word to read', () => {
  const id = 'rc-blend-02.man';

  it('is not read out to a child on their own, and neither are the pictures named', () => {
    expect(said(chooseScript(situation(id, 'independent')))).toEqual(['rc.read.instruction']);
  });

  it('is said slowly with support, and when help is asked for', () => {
    expect(said(chooseScript(situation(id, 'guided')))).toContain('slow.man');
    expect(said(chooseScript(situation(id, 'independent', 'hint-model')))).toContain('slow.man');
  });

  it('is said slowly and then plainly once it has been read rightly', () => {
    const order = said(chooseScript(situation(id, 'independent', 'correct')));
    expect(order.indexOf('slow.man')).toBeGreaterThan(-1);
    expect(order.indexOf('word.man')).toBeGreaterThan(order.indexOf('slow.man'));
  });
});

describe('a slow word, by ear', () => {
  it('is said slowly to everyone: that is the question', () => {
    expect(said(chooseScript(situation('rc-blend-01.mat', 'independent')))).toContain('slow.mat');
  });
});

describe('what made that sound?', () => {
  const id = 'rc-listen-01.whistle';

  it('plays the sound, and with support each thing’s own sound', () => {
    expect(said(chooseScript(situation(id, 'independent')))).toEqual([
      'rc.listen.instruction',
      'sound.whistle',
    ]);
    expect(said(chooseScript(situation(id, 'guided')))).toEqual(
      expect.arrayContaining(['sound.whistle', 'sound.bell', 'sound.bird']),
    );
  });

  it('knows which pictures make a sound of their own', () => {
    expect(soundOf({ type: 'picture', id: 'drum' })).toBe('sound.drum');
    expect(soundOf({ type: 'picture', id: 'sun' })).toBeNull();
    expect(soundOf({ type: 'letter', letters: 's' })).toBeNull();
  });
});

describe('a pattern of sounds to play back', () => {
  const lesson = lessonOf('rc-listen-02');
  const task = lesson.challenges.find((each) => each.id === 'rc-listen-02.drum-bell-drum')!;
  if (task.kind !== 'make') throw new Error('Expected a thing to make.');
  const make = (stage: Stage, event: ScriptEvent, again = false) =>
    makeScript(
      {
        stage,
        event,
        again,
        parts: 3,
        sequence: ['drum', 'bell', 'drum'],
        lines: { instruction: 'rc.echo.instruction', feedback: 'feedback', hint: 'hint' },
        seconds: () => 0.5,
      },
      task,
    )!;

  it('plays each thing’s own sound in order, lighting it as it sounds', () => {
    const script = make('independent', 'new');
    expect(said(script)).toEqual(['rc.echo.instruction', 'sound.drum', 'sound.bell', 'sound.drum']);
    const lit = script.moments.flatMap((moment) =>
      moment.beat?.show === 'name' ? [moment.beat.which] : [],
    );
    expect(lit).toEqual(['drum', 'bell', 'drum']);
  });

  it('does not play it again for the asking, but does as help and after a wrong try', () => {
    expect(said(make('independent', 'new', true))).toEqual(['rc.echo.instruction']);
    expect(said(make('independent', 'hint-model'))).toEqual([
      'hint',
      'sound.drum',
      'sound.bell',
      'sound.drum',
    ]);
    expect(said(make('independent', 'incorrect')).slice(1)).toEqual([
      'sound.drum',
      'sound.bell',
      'sound.drum',
    ]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The activities that came later
// ---------------------------------------------------------------------------------------------------------------------

/** When a clip begins in a script, in milliseconds; and the first time, where it is said more than once. */
const startOf = (script: Script, key: string, nth = 0): number => {
  const starts = script.moments.flatMap((moment) =>
    moment.sound?.kind === 'say' && moment.sound.key === key ? [moment.at] : [],
  );
  const at = starts[nth];
  if (at === undefined) throw new Error(`${key} is not said ${String(nth + 1)} times.`);
  return at;
};
/** Each time one part of what is asked about is shown: which part, and when. */
const partsShown = (script: Script) =>
  script.moments.flatMap((moment) =>
    moment.beat?.show === 'name' && moment.beat.which === 'prompt' && moment.beat.part !== undefined
      ? [{ part: moment.beat.part, at: moment.at }]
      : [],
  );
/** When each clap sounds. */
const claps = (script: Script) =>
  script.moments.flatMap((moment) => (moment.sound?.kind === 'tone' ? [moment.at] : []));
const marksIn = (key: string) =>
  ((marks as Record<string, number[]>)[key] ?? []).map((at) => Math.round(at * 1000));
const choiceOf = (id: string, which: string) => {
  const found = challenge(id).choices.find((choice) => choice.id === which);
  if (!found) throw new Error(`${id} has no choice ${which}.`);
  return { id: found.id, stimulus: found.stimulus };
};
const wrongOf = (id: string) => {
  const asked = challenge(id);
  return choiceOf(id, asked.choices.find((choice) => choice.id !== asked.answer)?.id ?? '');
};
const wordsOf = (id: string) =>
  challenge(id).choices.map((choice) =>
    choice.stimulus.type === 'picture' ? `word.${choice.stimulus.id}` : '',
  );

describe('which one rhymes?', () => {
  const alone = 'rc-rhyme-01.mat';
  const helped = 'rc-rhyme-01.guided-man';

  it('says the word once and then each choice, plainly, to a child on their own', () => {
    expect(said(chooseScript(situation(alone, 'independent')))).toEqual([
      'rc.rhyme.instruction',
      'word.mat',
      ...wordsOf(alone),
    ]);
  });

  it('with support says the word again before each choice, so that the two are heard side by side', () => {
    const [first, second] = wordsOf(helped);
    expect(said(chooseScript(situation(helped, 'guided')))).toEqual([
      'rc.rhyme.instruction',
      'word.man',
      first,
      'word.man',
      second,
    ]);
  });

  it('asked again by a child on their own, says the word and not the choices', () => {
    expect(said(chooseScript(situation(alone, 'independent', 'new', { again: true })))).toEqual([
      'rc.rhyme.instruction',
      'word.mat',
    ]);
  });

  it('never draws a sound out or says a word slowly: a rhyme is heard in whole words', () => {
    const events: ScriptEvent[] = ['new', 'correct', 'incorrect', 'hint-model', 'hint-reveal'];
    for (const stage of ['demo', 'guided', 'independent'] as const) {
      for (const event of events) {
        const spoken = said(
          chooseScript(situation(alone, stage, event, { tried: wrongOf(alone) })),
        );
        expect(spoken.filter((key) => /^(onset|slow|beats)\./.test(key))).toEqual([]);
      }
    }
  });

  it('says what a rhyme is in the demonstration, once the two words have been heard together', () => {
    const script = chooseScript(
      situation('rc-rhyme-01.demo', 'demo', 'new', {
        lines: {
          instruction: 'rc.rhyme.instruction',
          feedback: null,
          hint: null,
          correct: 'rc.rhyme.correct',
        },
      }),
    );
    expect(said(script)).toEqual([
      'lesson.watch',
      'rc.rhyme.instruction',
      'word.cat',
      'word.hat',
      'rc.rhyme.correct',
    ]);
    expect(script.settled).toEqual({ show: 'same' });
  });

  it('after a wrong answer says what was picked and then the word: they do not end the same', () => {
    const tried = wrongOf(alone);
    const picked = tried.stimulus.type === 'picture' ? `word.${tried.stimulus.id}` : '';
    expect(said(chooseScript(situation(alone, 'independent', 'incorrect', { tried })))).toEqual([
      'feedback',
      picked,
      'word.mat',
    ]);
  });

  it('as help says them side by side, and shown the answer says the two that rhyme', () => {
    const model = said(chooseScript(situation(alone, 'independent', 'hint-model')));
    expect(model.filter((key) => key === 'word.mat')).toHaveLength(3);
    expect(said(chooseScript(situation(alone, 'independent', 'hint-reveal')))).toEqual([
      'hint',
      'word.mat',
      'word.rat',
    ]);
  });
});

describe('clap the word', () => {
  const three = 'rc-syllables-01.demo';
  const two = 'rc-syllables-01.guided-apple';
  const one = 'rc-syllables-01.guided-sun';
  const alone = 'rc-syllables-01.octopus';

  it('claps a word for a child in its beats: a clap, and a mark, as each beat begins', () => {
    const script = chooseScript(situation(two, 'guided'));
    expect(said(script)).toEqual(['rc.beats.instruction', 'word.apple', 'beats.apple']);
    const begin = startOf(script, 'beats.apple');
    const when = marksIn('beats.apple');
    expect(when).toHaveLength(2);
    expect(partsShown(script)).toEqual(when.map((at, part) => ({ part, at: begin + at })));
    expect(claps(script)).toEqual(when.map((at) => begin + at));
    // And comes to rest with nothing left standing under the picture: the count is not left on show.
    expect(script.settled).toEqual({ show: 'rest' });
  });

  it('only says the word to a child on their own: the clapping is theirs to do', () => {
    const script = chooseScript(situation(alone, 'independent'));
    expect(said(script)).toEqual(['rc.beats.instruction', 'word.octopus']);
    expect(claps(script)).toEqual([]);
    expect(partsShown(script)).toEqual([]);
  });

  it('claps a word of one beat once, as the word is said', () => {
    const script = chooseScript(situation(one, 'guided'));
    expect(said(script)).toEqual(['rc.beats.instruction', 'word.sun', 'word.sun']);
    expect(claps(script)).toEqual([startOf(script, 'word.sun', 1)]);
    expect(partsShown(script).map((shown) => shown.part)).toEqual([0]);
  });

  it('does not clap it again for the asking', () => {
    const script = chooseScript(situation(two, 'guided', 'new', { again: true }));
    expect(said(script)).toEqual(['rc.beats.instruction', 'word.apple']);
    expect(claps(script)).toEqual([]);
  });

  it('in the demonstration claps the word and then plays the card that has as many claps', () => {
    const script = chooseScript(situation(three, 'demo'));
    expect(said(script)).toEqual([
      'lesson.watch',
      'rc.beats.instruction',
      'word.elephant',
      'beats.elephant',
    ]);
    const begin = startOf(script, 'beats.elephant');
    const word = marksIn('beats.elephant').map((at) => begin + at);
    const all = claps(script);
    expect(all.slice(0, 3)).toEqual(word);
    // Then the card: three more, a steady gap apart.
    const card = all.slice(3);
    expect(card).toHaveLength(3);
    expect((card[1] ?? 0) - (card[0] ?? 0)).toBe(CLAP_GAP);
    expect((card[2] ?? 0) - (card[1] ?? 0)).toBe(CLAP_GAP);
    const answer = challenge(three).answer;
    const lifted = script.moments.find(
      (moment) => moment.beat?.show === 'name' && moment.beat.which === answer,
    );
    expect(lifted?.at).toBe(card[0]);
    expect(script.settled).toEqual({ show: 'same' });
  });

  it('after a wrong answer plays the card that was picked and then claps the word: not the same number', () => {
    const tried = wrongOf(alone);
    const script = chooseScript(situation(alone, 'independent', 'incorrect', { tried }));
    const picked = tried.stimulus.type === 'scene' ? Number(tried.stimulus.of.count) : 0;
    expect(said(script)).toEqual(['feedback', 'beats.octopus']);
    expect(claps(script)).toHaveLength(picked + 3);
    // The card comes first.
    expect(claps(script)[picked - 1] ?? 0).toBeLessThan(startOf(script, 'beats.octopus'));
  });

  it('claps it out once it has been answered, and as help; shown the answer, plays its card', () => {
    const right = chooseScript(situation(alone, 'independent', 'correct'));
    expect(said(right)).toEqual(['beats.octopus', 'feedback']);
    expect(claps(right)).toHaveLength(3);
    expect(right.settled).toEqual({ show: 'same' });
    const help = chooseScript(situation(alone, 'independent', 'hint-model'));
    expect(said(help)).toEqual(['hint', 'beats.octopus']);
    const shown = chooseScript(situation(alone, 'independent', 'hint-reveal'));
    expect(said(shown)).toEqual(['hint']);
    expect(claps(shown)).toHaveLength(3);
  });
});

describe('read the sentence', () => {
  const helped = 'rc-sentences-01.guided-hen';
  const alone = 'rc-sentences-01.pen-in-cup';

  it('is not read to a child on their own, and neither are the pictures told', () => {
    expect(said(chooseScript(situation(alone, 'independent')))).toEqual([
      'rc.sentence.instruction',
    ]);
    expect(partsShown(chooseScript(situation(alone, 'independent')))).toEqual([]);
  });

  it('is read aloud with support, the finger under each word as that word begins', () => {
    const script = chooseScript(situation(helped, 'guided'));
    expect(said(script)).toEqual(['rc.sentence.instruction', 'sentence.hen-in-hut']);
    const begin = startOf(script, 'sentence.hen-in-hut');
    const when = marksIn('sentence.hen-in-hut');
    expect(when).toHaveLength(5);
    expect(partsShown(script)).toEqual(when.map((at, part) => ({ part, at: begin + at })));
    // The finger is gone once the reading is over.
    expect(script.settled).toEqual({ show: 'rest' });
    const last = script.moments.findLast((moment) => moment.beat !== undefined);
    expect(last?.beat).toEqual({ show: 'rest' });
  });

  it('is not read out after a wrong answer: that is asked for as help', () => {
    const script = chooseScript(
      situation(alone, 'independent', 'incorrect', { tried: wrongOf(alone) }),
    );
    expect(said(script)).toEqual(['feedback']);
    expect(said(chooseScript(situation(alone, 'independent', 'hint-model')))).toEqual([
      'hint',
      'sentence.pen-in-cup',
    ]);
  });

  it('is read aloud once it has been read rightly', () => {
    const script = chooseScript(situation(alone, 'independent', 'correct'));
    expect(said(script)).toEqual(['sentence.pen-in-cup', 'feedback']);
    expect(partsShown(script).map((shown) => shown.part)).toEqual([0, 1, 2, 3, 4]);
    expect(script.settled).toEqual({ show: 'same' });
  });

  it('in the demonstration is read, and then the picture it tells of is lifted', () => {
    const script = chooseScript(situation('rc-sentences-01.demo', 'demo'));
    expect(said(script)).toEqual([
      'lesson.watch',
      'rc.sentence.instruction',
      'sentence.cat-on-mat',
    ]);
    const answer = challenge('rc-sentences-01.demo').answer;
    const lifted = script.moments.find(
      (moment) => moment.beat?.show === 'name' && moment.beat.which === answer,
    );
    expect(lifted?.at ?? 0).toBeGreaterThan(startOf(script, 'sentence.cat-on-mat') + 700);
  });

  it('has a recording, with a mark for each word, of every sentence it asks', () => {
    for (const each of lessonOf('rc-sentences-01').challenges) {
      if (each.kind !== 'choose-one' || each.prompt.stimulus.type !== 'scene') continue;
      const words = each.prompt.stimulus.of.words as string[];
      const key = `sentence.${String(words[1])}-${String(words[2])}-${String(words[4])}`;
      expect(Object.hasOwn(manifest.clips, key), key).toBe(true);
      expect(marksIn(key), key).toHaveLength(words.length);
    }
  });
});

describe('a word to read, with support', () => {
  it('has the finger step from tile to tile as each sound of the slow word begins', () => {
    const script = chooseScript(situation('rc-blend-02.man', 'guided'));
    const begin = startOf(script, 'slow.man');
    const when = marksIn('slow.man');
    expect(when).toHaveLength(3);
    expect(partsShown(script)).toEqual(when.map((at, part) => ({ part, at: begin + at })));
  });

  it('does the same for a word with two letters to a sound: three sounds, three steps', () => {
    const script = chooseScript(situation('rc-blend-03.guided-fish', 'guided'));
    expect(partsShown(script).map((shown) => shown.part)).toEqual([0, 1, 2]);
    expect(said(script)).toContain('slow.fish');
  });
});

describe('build the word', () => {
  const lesson = lessonOf('rc-spell-01');
  const task = (name: string): MakeChallenge => {
    const found = lesson.challenges.find((each) => each.id === `rc-spell-01.${name}`);
    if (found?.kind !== 'make') throw new Error(`No word to build called ${name}.`);
    return found;
  };
  const build = (name: string, stage: Stage, event: ScriptEvent = 'new', again = false) => {
    const script = makeScript(
      {
        stage,
        event,
        again,
        parts: 3,
        sequence: [],
        lines: { instruction: 'rc.spell.instruction', feedback: 'feedback', hint: 'hint' },
        seconds: () => 1,
      },
      task(name),
    );
    if (!script) throw new Error('A word to build has a script.');
    return script;
  };
  const placed = (script: Script) =>
    script.moments.flatMap((moment) =>
      moment.beat?.show === 'do' ? [{ parts: moment.beat.parts, at: moment.at }] : [],
    );

  it('says the word once, plainly, to a child on their own: pulling it apart is theirs to do', () => {
    const script = build('map', 'independent');
    expect(said(script)).toEqual(['rc.spell.instruction', 'word.map']);
    expect(partsShown(script)).toEqual([]);
  });

  it('with support says it slowly as well, a place lit for each sound as the sound begins', () => {
    const script = build('guided-mat', 'guided');
    expect(said(script)).toEqual(['rc.spell.instruction', 'word.mat', 'slow.mat']);
    const begin = startOf(script, 'slow.mat');
    expect(partsShown(script)).toEqual(
      marksIn('slow.mat').map((at, part) => ({ part, at: begin + at })),
    );
    expect(script.settled).toEqual({ show: 'rest' });
  });

  it('does not say it slowly again for the asking', () => {
    expect(said(build('guided-mat', 'guided', 'new', true))).toEqual([
      'rc.spell.instruction',
      'word.mat',
    ]);
  });

  it('in the demonstration lights the three places, then puts each letter in its place as its sound comes', () => {
    const script = build('demo', 'demo');
    expect(said(script)).toEqual([
      'lesson.watch',
      'rc.spell.instruction',
      'word.sun',
      'slow.sun',
      'slow.sun',
      'word.sun',
    ]);
    const when = marksIn('slow.sun');
    const first = startOf(script, 'slow.sun', 0);
    const second = startOf(script, 'slow.sun', 1);
    expect(partsShown(script)).toEqual(when.map((at, part) => ({ part, at: first + at })));
    // No letter is placed before the second telling; then one for each sound, at its sound.
    expect(placed(script)).toEqual([
      { parts: 0, at: expect.any(Number) as number },
      ...when.map((at, index) => ({ parts: index + 1, at: second + at })),
    ]);
    expect(placed(script)[0]?.at ?? 0).toBeLessThanOrEqual(second);
    expect(script.settled).toEqual({ show: 'same' });
  });

  it('follows a wrong try with the slow word, and a right one with the slow word and then the word itself', () => {
    expect(said(build('map', 'independent', 'incorrect'))).toEqual(['feedback', 'slow.map']);
    const right = build('map', 'independent', 'correct');
    expect(said(right)).toEqual(['slow.map', 'word.map', 'feedback']);
    expect(partsShown(right).map((shown) => shown.part)).toEqual([0, 1, 2]);
    expect(right.settled).toEqual({ show: 'same' });
  });

  it('says it slowly as help, and for the other hints only what the hint says', () => {
    expect(said(build('map', 'independent', 'hint-model'))).toEqual(['hint', 'slow.map']);
    expect(said(build('map', 'independent', 'hint-step'))).toEqual(['hint']);
    expect(said(build('map', 'independent', 'hint-reveal'))).toEqual(['hint']);
  });

  it('has a slow recording, marked sound by sound, of every word there is to build', () => {
    for (const each of lesson.challenges) {
      if (each.kind !== 'make' || each.prompt.stimulus?.type !== 'picture') continue;
      const key = `slow.${each.prompt.stimulus.id}`;
      expect(hasMarks(key), key).toBe(true);
      expect(marksIn(key), key).toHaveLength(3);
    }
  });
});

describe('where the things in a clip begin', () => {
  it('is what was written down when the clip was made, in milliseconds', () => {
    expect(marksOf('beats.elephant', 3, 1360)).toEqual(marksIn('beats.elephant'));
    expect(marksOf('beats.elephant', 3, 1360)[0]).toBe(0);
  });

  it('is spread evenly where nothing was written down, or not for that many things', () => {
    expect(marksOf('word.sun', 1, 800)).toEqual([0]);
    expect(marksOf('no.such.clip', 4, 1000)).toEqual([0, 250, 500, 750]);
    // Marks for three things are no use for four.
    expect(marksOf('beats.elephant', 4, 1000)).toEqual([0, 250, 500, 750]);
    // And where even the length is not known, a steady step apart.
    const blind = marksOf('no.such.clip', 3, 0);
    expect(blind[0]).toBe(0);
    expect((blind[2] ?? 0) - (blind[1] ?? 0)).toBe((blind[1] ?? 0) - (blind[0] ?? 0));
    expect(blind[1]).toBeGreaterThan(200);
  });
});

describe('what a challenge may say, fetched before it is wanted', () => {
  const every = pack.lessons.flatMap((lesson) => lesson.challenges);

  it('is only ever a clip there is', () => {
    for (const each of every) {
      for (const key of linesFor(each)) {
        expect(Object.hasOwn(manifest.clips, key), `${each.id}: ${key}`).toBe(true);
      }
    }
  });

  it('has the clips each kind of question is shown in time with', () => {
    const of = (id: string) => linesFor(every.find((each) => each.id === id)!);
    expect(of('rc-sentences-01.demo')).toContain('sentence.cat-on-mat');
    expect(of('rc-syllables-01.demo')).toEqual(
      expect.arrayContaining(['word.elephant', 'beats.elephant']),
    );
    expect(of('rc-spell-01.demo')).toEqual(expect.arrayContaining(['word.sun', 'slow.sun']));
    expect(of('rc-rhyme-01.demo')).toEqual(
      expect.arrayContaining(['word.cat', 'word.hat', 'word.cup']),
    );
    expect(of('rc-blend-03.demo')).toEqual(expect.arrayContaining(['slow.ship', 'word.sun']));
    // A letter is given the word that stands for it.
    expect(of('rc-letters-05.meet-sh')).toContain('onset.ship');
  });

  it('covers everything any script of the question says beside its own lines', () => {
    const own = new Set(['lesson.watch', 'feedback', 'hint']);
    const events: ScriptEvent[] = ['new', 'correct', 'incorrect', 'hint-model', 'hint-reveal'];
    for (const each of every) {
      if (each.kind !== 'choose-one') continue;
      const ready = new Set(linesFor(each));
      for (const stage of ['demo', 'guided', 'independent'] as const) {
        for (const event of events) {
          const spoken = said(
            chooseScript(situation(each.id, stage, event, { tried: wrongOf(each.id) })),
          );
          for (const key of spoken) {
            if (own.has(key) || key === each.prompt.instruction) continue;
            expect(ready.has(key), `${each.id} ${stage} ${event}: ${key}`).toBe(true);
          }
        }
      }
    }
  });
});
