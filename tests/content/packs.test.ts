import { describe, expect, it } from 'vitest';
import { hasPack, loadPack, packText } from '@/content';
import { lintPack, quantityMisconception, type LintIssue } from '@/content/lint';
import { WORLD_IDS, parseContentPack } from '@/engine';
import { numberGardenPack } from '../helpers/content';
import { fixturePack } from '../helpers/fixturePack';

const packFiles = import.meta.glob<{ default: unknown }>('../../src/content/packs/*.json', {
  eager: true,
});

const codes = (issues: LintIssue[]) => issues.map((issue) => issue.code);

/**
 * A pack to break on purpose. It is handed over untyped: the point of these tests is to write what the types
 * would refuse, and see that the lint refuses it too.
 */
type Loose = Record<string, any>;

/** A deep copy of Number Garden's pack, broken, and linted with Number Garden's own rules. */
function broken(mutate: (pack: Loose) => void): LintIssue[] {
  const pack = structuredClone(numberGardenPack());
  mutate(pack);
  return lintPack(pack);
}

/**
 * The same for the pack made for the tests, which has one of every kind of thing to make. No world's rules apply
 * to it: only the checks every pack gets.
 */
function brokenFixture(mutate: (pack: Loose) => void): LintIssue[] {
  const pack = structuredClone(fixturePack());
  mutate(pack);
  return lintPack(pack, [], () => undefined);
}

describe('shipped content packs', () => {
  it('there is at least one', () => {
    expect(Object.keys(packFiles).length).toBeGreaterThan(0);
  });

  for (const [file, module] of Object.entries(packFiles)) {
    describe(file.replace(/^.*\//, ''), () => {
      const parsed = parseContentPack(module.default);

      it('matches the content schema', () => {
        expect(parsed.ok ? [] : parsed.issues).toEqual([]);
      });

      it('passes the content lint with no errors and no warnings', () => {
        if (!parsed.ok) throw new Error('schema');
        expect(lintPack(parsed.value)).toEqual([]);
      });

      it('is named after its world and version', () => {
        if (!parsed.ok) throw new Error('schema');
        expect(file).toContain(`/${parsed.value.world}.v${parsed.value.contentVersion}.json`);
      });

      it('keeps every activity inside a preschool attention span', () => {
        if (!parsed.ok) throw new Error('schema');
        for (const lesson of parsed.value.lessons) {
          expect(lesson.estimatedMinutes).toBeGreaterThanOrEqual(2);
          expect(lesson.estimatedMinutes).toBeLessThanOrEqual(5);
        }
      });
    });
  }
});

describe('loading a pack', () => {
  it('loads and validates the pack of a world that has one', async () => {
    expect(hasPack('number-garden')).toBe(true);
    const pack = await loadPack('number-garden');
    expect(pack.world).toBe('number-garden');
    expect(await loadPack('number-garden')).toBe(pack);
    expect(packText(pack, 'ng.same-amount.instruction')).toBe('Which group has the same amount?');
    expect(packText(pack, 'no.such.key')).toBe('no.such.key');
  });

  it('refuses a world with no content instead of inventing some', async () => {
    for (const world of WORLD_IDS.filter((id) => !hasPack(id))) {
      await expect(loadPack(world)).rejects.toThrow(/No content/);
    }
  });
});

describe('the content schema refuses malformed packs', () => {
  const base = () => structuredClone(numberGardenPack()) as unknown as Loose;
  const give = (p: Loose) => p.lessons[2].challenges[0];

  it.each([
    ['an unknown field (a typo)', (p: Loose) => (p.lessons[0].sumary = 'x')],
    ['an unknown world', (p: Loose) => (p.world = 'candy-castle')],
    ['a skill id that is not dotted', (p: Loose) => (p.skills[0].id = 'Counting')],
    ['a lesson id with a dot', (p: Loose) => (p.lessons[0].id = 'ng.same.amount')],
    ['a single-choice challenge', (p: Loose) => p.lessons[0].challenges[0].choices.pop()],
    ['a challenge with no hints', (p: Loose) => (p.lessons[0].challenges[0].hints = [])],
    ['a lesson with no demonstration', (p: Loose) => (p.lessons[0].plan.demo = [])],
    ['a lesson with no guided practice', (p: Loose) => (p.lessons[0].plan.guided = [])],
    ['an activity longer than five minutes', (p: Loose) => (p.lessons[0].estimatedMinutes = 12)],
    ['a quantity of zero', (p: Loose) => (p.lessons[0].challenges[0].prompt.stimulus.count = 0)],
    ['a future format version', (p: Loose) => (p.schemaVersion = 2)],
    ['a kind of challenge nobody has built', (p: Loose) => (give(p).kind = 'draw')],
    ['a kind of task nobody has built', (p: Loose) => (give(p).task.type = 'juggle')],
    ['a thing to make with no task', (p: Loose) => delete give(p).task],
    ['a pile of nothing', (p: Loose) => (give(p).task.pile = 0)],
    [
      'a card id that could not be written down',
      (p: Loose) => {
        p.lessons[6].challenges[0].task.cards[0].id = 'a-b';
      },
    ],
    [
      'a picture of nothing in particular',
      (p: Loose) => {
        p.lessons[0].challenges[0].prompt.stimulus = { type: 'hologram' };
      },
    ],
  ])('%s', (_name, mutate) => {
    const pack = base();
    mutate(pack);
    expect(parseContentPack(pack).ok).toBe(false);
  });

  it('reports where the problem is', () => {
    const pack = base();
    pack.lessons[0].challenges[1].answer = 'NOT A SLUG';
    const parsed = parseContentPack(pack);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.issues.join('\n')).toContain('lessons.0.challenges.1.answer');
  });
});

describe('the content lint catches authoring mistakes', () => {
  it('accepts the pack made for the tests, which has one of every kind of thing to make', () => {
    expect(brokenFixture(() => undefined)).toEqual([]);
  });

  it('the wrong choice marked as the answer', () => {
    const issues = broken((pack) => {
      pack.lessons[0].challenges[3].answer = 'a';
    });
    expect(codes(issues)).toContain('quantity-answer-wrong');
  });

  it('two choices that are both right', () => {
    const issues = broken((pack) => {
      pack.lessons[0].challenges[3].choices[0].stimulus.count = 2;
    });
    expect(codes(issues)).toEqual(expect.arrayContaining(['quantity-answer-count']));
  });

  it('an answer that is the same picture as the prompt', () => {
    const issues = broken((pack) => {
      const challenge = pack.lessons[0].challenges[0];
      challenge.choices[1].stimulus = { ...challenge.prompt.stimulus };
    });
    expect(codes(issues)).toContain('quantity-picture-match');
  });

  it('a challenge filed under the wrong lesson or skill', () => {
    const issues = broken((pack) => {
      pack.lessons[0].challenges[0].id = 'other-lesson.demo-two';
      pack.lessons[0].challenges[1].skillId = 'math.counting.count-to-5';
    });
    expect(codes(issues)).toEqual(
      expect.arrayContaining(['challenge-id-prefix', 'challenge-skill', 'plan-reference']),
    );
  });

  it('prerequisites that are missing, circular or self-referential', () => {
    const skill = numberGardenPack().skills[0]!;
    const withSkills = (extra: Partial<typeof skill>[]) =>
      broken((pack) => {
        pack.skills = extra.map((override) => ({ ...skill, ...override }));
      });

    expect(codes(withSkills([{ prerequisites: ['math.counting.unknown'] }]))).toContain(
      'skill-prerequisite-unknown',
    );
    expect(codes(withSkills([{ prerequisites: [skill.id] }]))).toContain('skill-prerequisite-self');
    expect(
      codes(
        withSkills([
          { prerequisites: ['math.b.two'] },
          { id: 'math.b.two', prerequisites: ['math.c.three'] },
          { id: 'math.c.three', prerequisites: [skill.id] },
        ]),
      ),
    ).toContain('skill-prerequisite-cycle');
  });

  it('accepts a prerequisite that another pack defines', () => {
    const pack = structuredClone(numberGardenPack());
    pack.skills[0]!.prerequisites = ['phonics.listening.same-or-different'];
    expect(codes(lintPack(pack))).toContain('skill-prerequisite-unknown');
    expect(lintPack(pack, ['phonics.listening.same-or-different'])).toEqual([]);
  });

  it('names quantity misconceptions by how far off the choice is', () => {
    expect(quantityMisconception(2, 3)).toBe('one-more');
    expect(quantityMisconception(2, 1)).toBe('one-fewer');
    expect(quantityMisconception(1, 3)).toBe('many-more');
    expect(quantityMisconception(3, 1)).toBe('many-fewer');
  });
});

/** The names of the rules a source file can report: every hyphenated word in quotes that is not known data. */
function rulesIn(source: string, data: readonly string[]): string[] {
  return [...new Set([...source.matchAll(/'([a-z]+(?:-[a-z]+)+)'/g)].map((match) => match[1]!))]
    .filter((name) => !data.includes(name))
    .sort();
}

/**
 * Every rule the lint has for every pack, each proven to fire on a copy of a real pack broken in exactly that way.
 * The last test reads the lint's own source, so a rule added without a case here fails the suite.
 */
describe('every lint rule fires', () => {
  const lesson = (pack: Loose) => pack.lessons[0];
  /** An independent challenge with three choices: a, b and the answer c. */
  const three = (pack: Loose) => lesson(pack).challenges[3];
  /** The fixture's things to make, by name. */
  const made = (pack: Loose, name: string) =>
    pack.lessons[0].challenges.find((challenge: Loose) => challenge.id.endsWith(`.${name}`));

  const BREAK: Record<string, (pack: Loose) => void> = {
    'challenge-id-prefix': (pack) => {
      three(pack).id = 'another-lesson.two-apples';
    },
    'challenge-skill': (pack) => {
      three(pack).skillId = 'math.counting.count-to-5';
    },
    'choice-id-duplicate': (pack) => {
      three(pack).choices[1].id = three(pack).choices[0].id;
    },
    'choice-label-duplicate': (pack) => {
      three(pack).choices[1].label = three(pack).choices[0].label;
    },
    'answer-missing': (pack) => {
      three(pack).answer = 'z';
    },
    'misconception-target': (pack) => {
      three(pack).misconceptions = { a: 'one-more', b: 'one-fewer', c: 'one-more' };
    },
    'cue-without-glance': (pack) => {
      three(pack).prompt.cue = { type: 'picture', id: 'sun' };
    },
    'hint-step-choices': (pack) => {
      three(pack).hints[0] = { type: 'step', count: 1, caption: 'ng.same-amount.hint.model' };
    },
    'hint-eliminate-target': (pack) => {
      three(pack).hints[1] = {
        type: 'eliminate',
        remove: ['c'],
        caption: 'ng.same-amount.hint.eliminate',
      };
    },
    'hint-eliminate-all': (pack) => {
      three(pack).hints[1] = {
        type: 'eliminate',
        remove: ['a', 'b'],
        caption: 'ng.same-amount.hint.eliminate',
      };
    },
    'hint-reveal-early': (pack) => {
      three(pack).hints.reverse();
    },
    'hint-ladder-end': (pack) => {
      three(pack).hints.pop();
    },
    'string-missing': (pack) => {
      delete pack.strings.en['ng.same-amount.incorrect'];
    },
    'string-unused': (pack) => {
      pack.strings.en['ng.same-amount.never-used'] = 'Nobody says this.';
    },
    'lesson-world': (pack) => {
      lesson(pack).world = 'robot-ridge';
    },
    'lesson-skill-unknown': (pack) => {
      lesson(pack).skillIds = ['math.counting.not-defined'];
    },
    'lesson-id-duplicate': (pack) => {
      pack.lessons.push(structuredClone(lesson(pack)));
    },
    'plan-reference': (pack) => {
      lesson(pack).plan.guided.push('ng-same-amount-01.not-written');
    },
    'plan-duplicate': (pack) => {
      lesson(pack).plan.guided.push(lesson(pack).plan.demo[0]);
    },
    'plan-count': (pack) => {
      lesson(pack).plan.independent.count = 6;
    },
    'plan-reprobes': (pack) => {
      lesson(pack).plan.independent.maxReprobes = 5;
    },
    'plan-variants': (pack) => {
      for (const challenge of lesson(pack).challenges) challenge.variant = 'only-one';
    },
    'challenge-orphan': (pack) => {
      lesson(pack).plan.independent.pool.pop();
    },
    'challenge-id-duplicate': (pack) => {
      lesson(pack).challenges[1].id = lesson(pack).challenges[0].id;
    },
    'success-criteria': (pack) => {
      lesson(pack).successCriteria.independentFirstTryCorrect = 4;
    },
    'skill-id-duplicate': (pack) => {
      pack.skills.push(structuredClone(pack.skills[0]));
    },
    'skill-world': (pack) => {
      pack.skills[0].world = 'robot-ridge';
    },
    'skill-untaught': (pack) => {
      pack.skills.push({ ...pack.skills[0], id: 'math.quantity.nobody-teaches-this' });
    },
    'skill-prerequisite-unknown': (pack) => {
      pack.skills[0].prerequisites = ['math.counting.not-defined'];
    },
    'skill-prerequisite-self': (pack) => {
      pack.skills[0].prerequisites = [pack.skills[0].id];
    },
    'skill-prerequisite-cycle': (pack) => {
      const first = pack.skills[0];
      pack.skills.push({ ...first, id: 'math.quantity.second', prerequisites: [first.id] });
      first.prerequisites = ['math.quantity.second'];
    },
  };

  /** Rules about things to make, each broken on the pack made for the tests. */
  const BREAK_MADE: Record<string, (pack: Loose) => void> = {
    'card-id-duplicate': (pack) => {
      const { cards } = made(pack, 'select-two').task;
      cards[1].id = cards[0].id;
    },
    'card-label-duplicate': (pack) => {
      const { cards } = made(pack, 'select-two').task;
      cards[1].label = cards[0].label;
    },
    'solution-card': (pack) => {
      made(pack, 'echo-two').task.solution = ['fox', 'wolf'];
    },
    'order-solution': (pack) => {
      made(pack, 'order-three').task.solution = ['seed', 'sprout'];
    },
    'select-solution': (pack) => {
      made(pack, 'select-two').task.solution = ['cat', 'cat'];
    },
    'select-all': (pack) => {
      made(pack, 'select-two').task.solution = ['cat', 'dog', 'hat', 'drum'];
    },
    'select-study': (pack) => {
      made(pack, 'recall-two').task.study = ['key', 'cup'];
    },
    'select-ask': (pack) => {
      delete made(pack, 'recall-two').task.ask;
    },
    'pairs-par': (pack) => {
      made(pack, 'pairs-three').task.par = 2;
    },
    'give-pile': (pack) => {
      made(pack, 'give-four').task.pile = 4;
    },
    'hint-eliminate-task': (pack) => {
      made(pack, 'give-four').hints[0] = {
        type: 'eliminate',
        remove: ['a'],
        caption: 'fx.hint.model',
      };
    },
    'hint-step-task': (pack) => {
      made(pack, 'pairs-three').hints = [
        { type: 'step', count: 1, caption: 'fx.hint.step' },
        { type: 'model', caption: 'fx.hint.model' },
      ];
    },
    'hint-step-all': (pack) => {
      made(pack, 'order-three').hints[1].count = 3;
    },
    'hint-reveal-task': (pack) => {
      made(pack, 'pairs-three').hints.push({ type: 'reveal', caption: 'fx.hint.reveal' });
    },
    'program-off-grid': (pack) => {
      made(pack, 'round-the-rock').task.goal = [5, 0];
    },
    'program-no-journey': (pack) => {
      made(pack, 'round-the-rock').task.goal = [0, 2];
    },
    'program-rock': (pack) => {
      made(pack, 'round-the-rock').task.rocks = [[2, 0]];
    },
    'program-solution-unbuildable': (pack) => {
      made(pack, 'round-the-rock').task.slots = 4;
    },
    'program-solution-wrong': (pack) => {
      made(pack, 'round-the-rock').task.solution = 'f-f-r-f';
    },
    'program-solution-long': (pack) => {
      made(pack, 'round-the-rock').task.rocks = [];
      made(pack, 'round-the-rock').task.solution = 'f-f-r-f-f-f';
    },
    'program-given-unbuildable': (pack) => {
      made(pack, 'mend-it').task.given = 'f-l-f-f';
    },
    'program-given-works': (pack) => {
      made(pack, 'mend-it').task.given = 'f-f-f';
    },
    'design-control-duplicate': (pack) => {
      const { controls } = made(pack, 'ramp').task;
      controls.push(structuredClone(controls[0]));
    },
    'design-solution-unbuildable': (pack) => {
      made(pack, 'ramp').task.solution = ['steep'];
    },
    'design-solution-wrong': (pack) => {
      made(pack, 'ramp').task.solution = ['low'];
    },
    'beat-need': (pack) => {
      // Half the beats: tapping at half the pace would pass.
      made(pack, 'keep-time').task.need = 4;
    },
    'tune-notes': (pack) => {
      made(pack, 'climb').task.notes = ['c4', 'g4', 'e4', 'c5'];
    },
    'tune-solution-unbuildable': (pack) => {
      made(pack, 'climb').task.solution = ['c4', 'e4', 'a4'];
    },
    'tune-solution-wrong': (pack) => {
      made(pack, 'climb').task.solution = ['g4', 'e4', 'c4'];
    },
    'design-nothing-to-find': (pack) => {
      made(pack, 'ramp').task.controls[0].options = ['mid', 'mid'];
    },
  };

  it.each(Object.keys(BREAK))('%s', (code) => {
    expect(codes(broken(BREAK[code]!))).toContain(code);
  });

  it.each(Object.keys(BREAK_MADE))('%s', (code) => {
    expect(codes(brokenFixture(BREAK_MADE[code]!))).toContain(code);
  });

  it('a pack for a world that has no rules of its own is refused', () => {
    expect(codes(lintPack(numberGardenPack(), [], null))).toContain('world-rules');
  });

  it('has a case here for every rule in the lint', async () => {
    const source = (await import('@/content/lint.ts?raw')).default;
    // A kind of challenge, not a rule.
    expect(rulesIn(source, ['choose-one'])).toEqual(
      [...Object.keys(BREAK), ...Object.keys(BREAK_MADE), 'world-rules'].sort(),
    );
  });
});

/** Number Garden's own rules: what makes an answer about amounts right. */
describe('every Number Garden rule fires', () => {
  const challenge = (pack: Loose, lesson: number, index: number) =>
    pack.lessons[lesson].challenges[index];
  /** Same amount: an independent challenge with three choices, a, b and the answer c. */
  const three = (pack: Loose) => challenge(pack, 0, 3);
  /** One for each: three snails, with places. */
  const give = (pack: Loose) => challenge(pack, 2, 0);
  /** Which has more: two leaves against four apples. */
  const more = (pack: Loose) => challenge(pack, 4, 0);
  /** Two that are equal, out of four groups: 2, 3, 3 and 4. */
  const equal = (pack: Loose) => challenge(pack, 6, 9);

  const BREAK: Record<string, (pack: Loose) => void> = {
    'quantity-choice': (pack) => {
      three(pack).choices[0].stimulus = { type: 'picture', id: 'sun' };
    },
    'quantity-answer-count': (pack) => {
      three(pack).prompt.stimulus.count = 9;
    },
    'quantity-answer-wrong': (pack) => {
      three(pack).answer = 'a';
    },
    'quantity-duplicate-choice': (pack) => {
      three(pack).choices[0].stimulus.count = three(pack).choices[1].stimulus.count;
    },
    'quantity-picture-match': (pack) => {
      three(pack).choices[2].stimulus = { ...three(pack).prompt.stimulus };
    },
    'quantity-size': (pack) => {
      three(pack).choices[0].stimulus = {
        ...three(pack).choices[0].stimulus,
        count: 3,
        arrangement: 'cluster',
        size: 'big',
      };
    },
    'misconception-missing': (pack) => {
      delete three(pack).misconceptions;
    },
    'misconception-wrong': (pack) => {
      three(pack).misconceptions = { a: 'one-fewer', b: 'one-fewer' };
    },
    'compare-tie': (pack) => {
      more(pack).choices[0].stimulus.count = more(pack).choices[1].stimulus.count;
    },
    'compare-answer-wrong': (pack) => {
      more(pack).answer = 'a';
    },
    'give-pile-small': (pack) => {
      give(pack).task.pile = Number(give(pack).task.want.count) + 1;
    },
    'give-same-thing': (pack) => {
      give(pack).task.item = give(pack).task.want.item;
    },
    'equal-pair': (pack) => {
      equal(pack).task.solution = ['b'];
    },
    'equal-answer-wrong': (pack) => {
      equal(pack).task.solution = ['a', 'b'];
    },
    'equal-second-pair': (pack) => {
      equal(pack).task.cards[3].stimulus.count = equal(pack).task.cards[0].stimulus.count;
    },
    'number-garden-task': (pack) => {
      give(pack).task = {
        type: 'order',
        cards: equal(pack).task.cards.slice(0, 2),
        solution: ['a', 'b'],
      };
    },
    'number-garden-question': (pack) => {
      three(pack).prompt.stimulus = { type: 'picture', id: 'sun' };
    },
  };

  it('the cases below break what they think they break', () => {
    const pack = numberGardenPack() as unknown as Loose;
    expect(three(pack).choices.map((choice: Loose) => choice.id)).toEqual(['a', 'b', 'c']);
    expect(three(pack).answer).toBe('c');
    expect(give(pack).task.type).toBe('give');
    expect(more(pack).prompt.stimulus).toEqual({ type: 'sign', id: 'more' });
    expect(equal(pack).task.cards.map((card: Loose) => card.stimulus.count)).toEqual([2, 3, 3, 4]);
  });

  it.each(Object.keys(BREAK))('%s', (code) => {
    expect(codes(broken(BREAK[code]!))).toContain(code);
  });

  it('has a case here for every rule Number Garden has', async () => {
    const source = (await import('@/content/rules/numberGarden.ts?raw')).default;
    // What a wrong choice is tagged with is data the rules produce, not a rule.
    const tags = ['bigger-looks-more', 'picked-fewer', 'smaller-looks-fewer', 'picked-more'];
    expect(rulesIn(source, [...tags, 'choose-one'])).toEqual(Object.keys(BREAK).sort());
  });
});
