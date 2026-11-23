import { describe, expect, it } from 'vitest';
import readingCove from '@/content/packs/reading-cove.v1.json';
import { parseContentPack, type ChooseOneChallenge, type Lesson, type Stage } from '@/engine';
import type { ChooseSituation, Script, ScriptEvent } from '@/game/lesson/script';
import { chooseScript, keywordFor, makeScript, soundOf } from '@/game/worlds/reading-cove/script';

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
