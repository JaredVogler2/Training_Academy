import { describe, expect, it } from 'vitest';
import numberGarden from '@/content/packs/number-garden.v3.json';
import { lintPack } from '@/content/lint';
import { skillLimit } from '@/content/rules/numberGardenNumbers';
import {
  amountShown,
  parseContentPack,
  readNumberPicture,
  type ChooseOneChallenge,
  type ContentPack,
  type Lesson,
  type Stimulus,
} from '@/engine';
import { breaking, challengeIn, codes, rulesIn, type Loose } from '../helpers/lint';

function pack(): ContentPack {
  const parsed = parseContentPack(numberGarden);
  if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
  return parsed.value;
}
const broken = breaking(pack);

/** The activities that bring numerals in, in the order they are met. */
const LATER = [
  'ng-stairs-01',
  'ng-frame-01',
  'ng-frame-02',
  'ng-numerals-01',
  'ng-numerals-02',
  'ng-numerals-03',
  'ng-line-01',
  'ng-add-01',
  'ng-take-01',
  'ng-add-02',
  'ng-take-02',
];
/** The ones in which a numeral is shown. In every other activity of Number Garden there is none to read. */
const WITH_NUMERALS = [
  'ng-numerals-01',
  'ng-numerals-02',
  'ng-numerals-03',
  'ng-line-01',
  'ng-add-02',
  'ng-take-02',
];

const later = (): Lesson[] => pack().lessons.filter((lesson) => LATER.includes(lesson.id));
const questions = (lesson: Lesson): ChooseOneChallenge[] =>
  lesson.challenges.flatMap((challenge) => (challenge.kind === 'choose-one' ? [challenge] : []));
const shownIn = (lesson: Lesson): Stimulus[] =>
  lesson.challenges.flatMap((challenge) =>
    challenge.kind === 'choose-one'
      ? [challenge.prompt.stimulus, ...challenge.choices.map((choice) => choice.stimulus)]
      : challenge.task.type === 'give'
        ? [challenge.task.want]
        : 'cards' in challenge.task
          ? challenge.task.cards.map((card) => card.stimulus)
          : [],
  );
const hasNumeral = (stimulus: Stimulus): boolean => {
  const kind = readNumberPicture(stimulus)?.kind;
  return kind === 'numeral' || kind === 'path' || kind === 'spoken';
};

describe('Number Garden, as it is shipped', () => {
  it('passes its own rules', () => {
    expect(lintPack(pack())).toEqual([]);
  });

  it('keeps its first seven activities where they were, and adds eleven after them', () => {
    expect(pack().lessons.map((lesson) => lesson.id)).toEqual([
      'ng-same-amount-01',
      'ng-glance-01',
      'ng-give-01',
      'ng-give-02',
      'ng-more-01',
      'ng-fewer-01',
      'ng-equal-01',
      ...LATER,
    ]);
  });

  it('shows no numeral anywhere until the activities that are about numerals', () => {
    for (const lesson of pack().lessons) {
      const numerals = shownIn(lesson).filter(hasNumeral).length;
      if (WITH_NUMERALS.includes(lesson.id)) expect(numerals, lesson.id).toBeGreaterThan(0);
      else expect(numerals, lesson.id).toBe(0);
    }
  });

  it('has exactly one right answer to every one of its later questions, worked out here from the pictures', () => {
    for (const lesson of later()) {
      for (const challenge of questions(lesson)) {
        const target = amountShown(challenge.prompt.stimulus);
        expect(target, challenge.id).not.toBeNull();
        const right = challenge.choices.filter((choice) => amountShown(choice.stimulus) === target);
        expect(
          right.map((choice) => choice.id),
          challenge.id,
        ).toEqual([challenge.answer]);
      }
    }
  });

  it('asks no later question twice in an activity: the same thing asked about, with the same things to choose from', () => {
    for (const lesson of later()) {
      const asked = questions(lesson).map((challenge) =>
        JSON.stringify([
          challenge.prompt.stimulus,
          challenge.choices.map((choice) => JSON.stringify(choice.stimulus)).sort(),
        ]),
      );
      expect(new Set(asked).size, lesson.id).toBe(asked.length);
    }
  });

  it('asks on its own, in every later activity, about at least four different amounts in more than one way', () => {
    for (const lesson of later()) {
      const pool = questions(lesson).filter((challenge) =>
        lesson.plan.independent.pool.includes(challenge.id),
      );
      expect(pool.length, lesson.id).toBeGreaterThanOrEqual(9);
      const amounts = new Set(pool.map((challenge) => amountShown(challenge.prompt.stimulus)));
      expect(amounts.size, lesson.id).toBeGreaterThanOrEqual(4);
      expect(new Set(pool.map((challenge) => challenge.variant)).size, lesson.id).toBeGreaterThan(
        1,
      );
    }
  });

  it('lays the groups it offers out in more than one way in every activity that offers groups', () => {
    for (const lesson of later()) {
      const layouts = new Set(
        questions(lesson).flatMap((challenge) =>
          challenge.choices.flatMap((choice) =>
            choice.stimulus.type === 'quantity' && choice.stimulus.count > 1
              ? [choice.stimulus.arrangement]
              : [],
          ),
        ),
      );
      if (layouts.size > 0) expect(layouts.size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('marks the activity that is put by ear as needing sound, and no other', () => {
    const needs = pack()
      .lessons.filter((lesson) => lesson.needsSound === true)
      .map((lesson) => lesson.id);
    expect(needs).toEqual(['ng-numerals-03']);
  });

  it('has well over a hundred later questions', () => {
    const count = later().reduce((total, lesson) => total + lesson.challenges.length, 0);
    expect(count).toBe(142);
  });
});

describe('the most a skill is about', () => {
  it('is read from the end of its name', () => {
    expect(skillLimit('math.numerals.read-to-5')).toBe(5);
    expect(skillLimit('math.adding.within-10')).toBe(10);
    expect(skillLimit('math.bonds.to-10')).toBe(10);
    expect(skillLimit('math.comparison.equal')).toBeNull();
    // A number in the middle of a name is not a limit.
    expect(skillLimit('math.up-to-5.things')).toBeNull();
  });
});

describe('every rule for the later questions fires', () => {
  const numeral = (value: number) => ({ type: 'scene', scene: 'numeral', of: { value } });
  /** One acorn, and the numerals 1, 2 and 3 to choose from. */
  const toNumeral = (loose: Loose) => challengeIn(loose, 'ng-numerals-01.one-acorn');
  /** The numeral 3, and groups of 2, 3 and 4 apples. */
  const toGroup = (loose: Loose) => challengeIn(loose, 'ng-numerals-01.find-three');
  /** Towers of 2, 3 and 4 and then a gap, with towers of 5, 4 and 6 to choose from. */
  const stairs = (loose: Loose) => challengeIn(loose, 'ng-stairs-01.next-five');
  /** Stones numbered 2, 3, 4 and a bare one, with 5, 6 and 1 to choose from. */
  const path = (loose: Loose) => challengeIn(loose, 'ng-line-01.next-five');
  /** Three snails and one more, with groups of 4, 3 and 5 snails to choose from. */
  const story = (loose: Loose) => challengeIn(loose, 'ng-add-01.three-and-one');
  const lesson = (loose: Loose, id: string): Loose =>
    (loose.lessons as Loose[]).find((candidate) => candidate.id === id) ?? {};

  const BREAK: Record<string, (loose: Loose) => void> = {
    'number-picture': (loose) => {
      toNumeral(loose).choices[0].stimulus = numeral(12);
    },
    'number-form': (loose) => {
      stairs(loose).choices[1].stimulus = numeral(4);
    },
    'number-form-mixed': (loose) => {
      toGroup(loose).choices[0].stimulus = numeral(2);
    },
    'number-other-thing': (loose) => {
      story(loose).choices[1].stimulus.item = 'apple';
    },
    'number-answer-count': (loose) => {
      path(loose).prompt.stimulus.of.gap = 4;
    },
    'number-answer-wrong': (loose) => {
      path(loose).answer = 'b';
    },
    'number-duplicate-choice': (loose) => {
      toNumeral(loose).choices[1].stimulus = numeral(3);
    },
    'number-beyond-skill': (loose) => {
      toNumeral(loose).choices[2].stimulus = numeral(7);
    },
    'number-misconception-missing': (loose) => {
      delete story(loose).misconceptions;
    },
    'number-misconception-wrong': (loose) => {
      story(loose).misconceptions = { b: 'one-more', c: 'one-more' };
    },
    'number-needs-sound': (loose) => {
      delete lesson(loose, 'ng-numerals-03').needsSound;
    },
    'number-sound-not-needed': (loose) => {
      lesson(loose, 'ng-numerals-01').needsSound = true;
    },
  };

  it('the cases below break what they think they break', () => {
    const loose = pack() as unknown as Loose;
    expect(toNumeral(loose).prompt.stimulus).toMatchObject({ item: 'acorn', count: 1 });
    expect(toNumeral(loose).choices.map((choice: Loose) => choice.stimulus.of.value)).toEqual([
      1, 2, 3,
    ]);
    expect(toGroup(loose).prompt.stimulus.of.value).toBe(3);
    expect(toGroup(loose).choices.map((choice: Loose) => choice.stimulus.count)).toEqual([2, 3, 4]);
    expect(stairs(loose).prompt.stimulus.of.heights).toEqual([2, 3, 4, 0]);
    expect(path(loose).prompt.stimulus.of).toEqual({ from: 2, to: 5, gap: 5 });
    expect(path(loose).answer).toBe('a');
    expect(story(loose).prompt.stimulus.of).toEqual({
      kind: 'join',
      item: 'snail',
      start: 3,
      change: 1,
    });
    expect(story(loose).misconceptions).toEqual({
      b: 'counted-what-was-there-first',
      c: 'one-more',
    });
    expect(lesson(loose, 'ng-numerals-03').needsSound).toBe(true);
  });

  it.each(Object.keys(BREAK))('%s', (code) => {
    expect(codes(broken(BREAK[code]!))).toContain(code);
  });

  it('has a case here for every rule the later questions have', async () => {
    const source = (await import('@/content/rules/numberGardenNumbers.ts?raw')).default;
    expect(rulesIn(source, [])).toEqual(Object.keys(BREAK).sort());
  });
});
