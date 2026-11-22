import { describe, expect, it } from 'vitest';
import { hasPack, loadPack, packText } from '@/content';
import { lintPack, quantityMisconception, type LintIssue } from '@/content/lint';
import { WORLD_IDS, parseContentPack, type ContentPack } from '@/engine';
import { numberGardenPack } from '../helpers/content';

const packFiles = import.meta.glob<{ default: unknown }>('../../src/content/packs/*.json', {
  eager: true,
});

const codes = (issues: LintIssue[]) => issues.map((issue) => issue.code);

/** A deep copy of the sample pack to break on purpose. */
function broken(mutate: (pack: ContentPack) => void): LintIssue[] {
  const pack = structuredClone(numberGardenPack());
  mutate(pack);
  return lintPack(pack);
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
    const empty = WORLD_IDS.filter((world) => !hasPack(world));
    expect(empty.length).toBeGreaterThan(0);
    for (const world of empty) await expect(loadPack(world)).rejects.toThrow(/No content/);
  });
});

describe('the content schema refuses malformed packs', () => {
  const base = () => structuredClone(numberGardenPack()) as unknown as Record<string, any>;

  it.each([
    ['an unknown field (a typo)', (p: Record<string, any>) => (p.lessons[0].sumary = 'x')],
    ['an unknown world', (p: Record<string, any>) => (p.world = 'candy-castle')],
    ['a skill id that is not dotted', (p: Record<string, any>) => (p.skills[0].id = 'Counting')],
    ['a lesson id with a dot', (p: Record<string, any>) => (p.lessons[0].id = 'ng.same.amount')],
    [
      'a single-choice challenge',
      (p: Record<string, any>) => p.lessons[0].challenges[0].choices.pop(),
    ],
    [
      'a challenge with no hints',
      (p: Record<string, any>) => (p.lessons[0].challenges[0].hints = []),
    ],
    ['a lesson with no demonstration', (p: Record<string, any>) => (p.lessons[0].plan.demo = [])],
    [
      'a lesson with no guided practice',
      (p: Record<string, any>) => (p.lessons[0].plan.guided = []),
    ],
    [
      'an activity longer than five minutes',
      (p: Record<string, any>) => (p.lessons[0].estimatedMinutes = 12),
    ],
    [
      'a quantity of zero',
      (p: Record<string, any>) => (p.lessons[0].challenges[0].prompt.stimulus.count = 0),
    ],
    ['a future format version', (p: Record<string, any>) => (p.schemaVersion = 2)],
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
  it('the wrong choice marked as the answer', () => {
    const issues = broken((pack) => {
      const challenge = pack.lessons[0]!.challenges[3]!;
      challenge.answer = 'a';
    });
    expect(codes(issues)).toContain('quantity-answer-wrong');
  });

  it('two choices that are both right', () => {
    const issues = broken((pack) => {
      pack.lessons[0]!.challenges[3]!.choices[0]!.stimulus.count = 2;
    });
    expect(codes(issues)).toEqual(expect.arrayContaining(['quantity-answer-count']));
  });

  it('no choice that is right', () => {
    const issues = broken((pack) => {
      pack.lessons[0]!.challenges[3]!.prompt.stimulus.count = 7;
    });
    expect(codes(issues)).toContain('quantity-answer-count');
  });

  it('an answer that is the same picture as the prompt', () => {
    const issues = broken((pack) => {
      const challenge = pack.lessons[0]!.challenges[0]!;
      challenge.choices[1]!.stimulus = { ...challenge.prompt.stimulus };
    });
    expect(codes(issues)).toContain('quantity-picture-match');
  });

  it('a mislabelled misconception', () => {
    const issues = broken((pack) => {
      pack.lessons[0]!.challenges[3]!.misconceptions = { a: 'one-fewer', b: 'one-fewer' };
    });
    expect(codes(issues)).toContain('misconception-wrong');
  });

  it('a hint that removes the right answer', () => {
    const issues = broken((pack) => {
      pack.lessons[0]!.challenges[3]!.hints[1] = {
        type: 'eliminate',
        remove: ['c'],
        caption: 'ng.same-amount.hint.eliminate',
      };
    });
    expect(codes(issues)).toContain('hint-eliminate-target');
  });

  it('a hint ladder that can leave a child stuck', () => {
    const issues = broken((pack) => {
      pack.lessons[0]!.challenges[3]!.hints.pop();
    });
    expect(codes(issues)).toContain('hint-ladder-end');
  });

  it('a reveal before the last rung', () => {
    const issues = broken((pack) => {
      pack.lessons[0]!.challenges[3]!.hints.reverse();
    });
    expect(codes(issues)).toContain('hint-reveal-early');
  });

  it('a plan that refers to a challenge that does not exist', () => {
    const issues = broken((pack) => {
      pack.lessons[0]!.plan.guided.push('ng-same-amount-01.missing');
    });
    expect(codes(issues)).toContain('plan-reference');
  });

  it('a challenge used twice in one plan', () => {
    const issues = broken((pack) => {
      pack.lessons[0]!.plan.guided.push('ng-same-amount-01.demo-two');
    });
    expect(codes(issues)).toContain('plan-duplicate');
  });

  it('drawing more probes than the pool holds', () => {
    const issues = broken((pack) => {
      pack.lessons[0]!.plan.independent.count = 9;
    });
    expect(codes(issues)).toContain('plan-count');
  });

  it('an independent pool with only one presentation', () => {
    const issues = broken((pack) => {
      for (const challenge of pack.lessons[0]!.challenges) challenge.variant = 'same';
    });
    expect(codes(issues)).toContain('plan-variants');
  });

  it('a success bar higher than the lesson can reach', () => {
    const issues = broken((pack) => {
      pack.lessons[0]!.successCriteria.independentFirstTryCorrect = 4;
    });
    expect(codes(issues)).toContain('success-criteria');
  });

  it('a challenge filed under the wrong lesson or skill', () => {
    const issues = broken((pack) => {
      pack.lessons[0]!.challenges[0]!.id = 'other-lesson.demo-two';
      pack.lessons[0]!.challenges[1]!.skillId = 'math.counting.count-to-5';
    });
    expect(codes(issues)).toEqual(
      expect.arrayContaining(['challenge-id-prefix', 'challenge-skill', 'plan-reference']),
    );
  });

  it('a missing string', () => {
    const issues = broken((pack) => {
      delete pack.strings.en['ng.same-amount.correct'];
    });
    expect(codes(issues)).toContain('string-missing');
  });

  it('duplicate ids', () => {
    const issues = broken((pack) => {
      pack.skills.push(structuredClone(pack.skills[0]!));
      pack.lessons[0]!.challenges[1]!.id = pack.lessons[0]!.challenges[0]!.id;
    });
    expect(codes(issues)).toEqual(
      expect.arrayContaining(['skill-id-duplicate', 'challenge-id-duplicate']),
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

/**
 * Every rule the lint has, each proven to fire on a copy of the real pack broken in exactly that way. The last test
 * reads the lint's own source, so a rule added without a case here fails the suite.
 */
describe('every lint rule fires', () => {
  const lesson = (pack: ContentPack) => pack.lessons[0]!;
  /** An independent challenge with three choices: a, b and the answer c. */
  const three = (pack: ContentPack) => lesson(pack).challenges[3]!;

  const BREAK: Record<string, (pack: ContentPack) => void> = {
    'challenge-id-prefix': (pack) => {
      three(pack).id = 'another-lesson.two-apples';
    },
    'challenge-skill': (pack) => {
      three(pack).skillId = 'math.counting.count-to-5';
    },
    'choice-id-duplicate': (pack) => {
      three(pack).choices[1]!.id = three(pack).choices[0]!.id;
    },
    'choice-label-duplicate': (pack) => {
      three(pack).choices[1]!.label = three(pack).choices[0]!.label;
    },
    'answer-missing': (pack) => {
      three(pack).answer = 'z';
    },
    'quantity-answer-count': (pack) => {
      three(pack).prompt.stimulus.count = 9;
    },
    'quantity-answer-wrong': (pack) => {
      three(pack).answer = 'a';
    },
    'quantity-duplicate-choice': (pack) => {
      three(pack).choices[0]!.stimulus.count = three(pack).choices[1]!.stimulus.count;
    },
    'quantity-picture-match': (pack) => {
      three(pack).choices[2]!.stimulus = { ...three(pack).prompt.stimulus };
    },
    'misconception-missing': (pack) => {
      delete three(pack).misconceptions;
    },
    'misconception-wrong': (pack) => {
      three(pack).misconceptions = { a: 'one-fewer', b: 'one-fewer' };
    },
    'misconception-target': (pack) => {
      three(pack).misconceptions = { a: 'one-more', b: 'one-fewer', c: 'one-more' };
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
      lesson(pack).plan.guided.push(lesson(pack).plan.demo[0]!);
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
      lesson(pack).challenges[1]!.id = lesson(pack).challenges[0]!.id;
    },
    'success-criteria': (pack) => {
      lesson(pack).successCriteria.independentFirstTryCorrect = 4;
    },
    'skill-id-duplicate': (pack) => {
      pack.skills.push(structuredClone(pack.skills[0]!));
    },
    'skill-world': (pack) => {
      pack.skills[0]!.world = 'robot-ridge';
    },
    'skill-untaught': (pack) => {
      pack.skills.push({ ...pack.skills[0]!, id: 'math.quantity.nobody-teaches-this' });
    },
    'skill-prerequisite-unknown': (pack) => {
      pack.skills[0]!.prerequisites = ['math.counting.not-defined'];
    },
    'skill-prerequisite-self': (pack) => {
      pack.skills[0]!.prerequisites = [pack.skills[0]!.id];
    },
    'skill-prerequisite-cycle': (pack) => {
      const first = pack.skills[0]!;
      pack.skills.push({ ...first, id: 'math.quantity.second', prerequisites: [first.id] });
      first.prerequisites = ['math.quantity.second'];
    },
  };

  it.each(Object.keys(BREAK))('%s', (code) => {
    expect(codes(broken(BREAK[code]!))).toContain(code);
  });

  it('has a case here for every rule in the lint', async () => {
    const source = (await import('@/content/lint.ts?raw')).default;
    const inSource = new Set(
      [...source.matchAll(/'([a-z]+(?:-[a-z]+)+)'/g)]
        .map((match) => match[1]!)
        // The misconception tags are data the lint produces, not rule names.
        .filter((name) => !['one-more', 'one-fewer', 'many-more', 'many-fewer'].includes(name)),
    );
    expect([...inSource].sort()).toEqual(Object.keys(BREAK).sort());
  });
});
