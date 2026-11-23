import { describe, expect, it } from 'vitest';
import inventorIsland from '@/content/packs/inventor-island.v1.json';
import { lintPack, type LintIssue } from '@/content/lint';
import { guessMisconception } from '@/content/rules/inventorIsland';
import { OUTCOMES, parseContentPack, testSetup, type ContentPack } from '@/engine';

/**
 * Inventor Island's own rules: that what a challenge says happens is what the model says happens. Each rule is
 * proven to fire on a copy of the real pack broken in exactly that way, and the last test reads the rules' own
 * source, so a rule added without a case here fails the suite.
 */

function inventorIslandPack(): ContentPack {
  const parsed = parseContentPack(structuredClone(inventorIsland));
  if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
  return parsed.value;
}

/** Handed over untyped: these tests write what the types would refuse, to see the lint refuse it too. */
type Loose = Record<string, any>;

const codes = (issues: LintIssue[]) => issues.map((issue) => issue.code);

function broken(mutate: (pack: Loose) => void): LintIssue[] {
  const pack = structuredClone(inventorIslandPack());
  mutate(pack);
  return lintPack(pack);
}

const challenge = (pack: Loose, lesson: number, index: number) =>
  pack.lessons[lesson].challenges[index];
/** Will the bridge hold? A goat, a gap of two, a thin plank and no posts: it sags. */
const guess = (pack: Loose) => challenge(pack, 0, 0);
/** Mend it: the same bridge; a thick plank is the answer shown. */
const mend = (pack: Loose) => challenge(pack, 0, 1);
/** Where will the ball stop? Three ways it could turn out. */
const threeWays = (pack: Loose) => challenge(pack, 1, 0);

/** The names of the rules a source file can report: every hyphenated word in quotes. */
function rulesIn(source: string): string[] {
  return [
    ...new Set([...source.matchAll(/'([a-z]+(?:-[a-z]+)+)'/g)].map((match) => match[1]!)),
  ].sort();
}

describe('the pack as it is written', () => {
  const pack = inventorIslandPack();

  it('passes the content lint with no errors and no warnings', () => {
    expect(lintPack(pack)).toEqual([]);
  });

  it('has four lessons, each with things to guess and things to mend', () => {
    expect(pack.lessons.map((lesson) => lesson.id)).toEqual([
      'ii-bridge-01',
      'ii-ramp-01',
      'ii-balance-01',
      'ii-float-01',
    ]);
    for (const lesson of pack.lessons) {
      const kinds = (ids: readonly string[]) =>
        ids.map((id) => lesson.challenges.find((candidate) => candidate.id === id)?.kind);
      // Glim shows a guess and then a mend; the child does one of each with help.
      expect(kinds(lesson.plan.demo), lesson.id).toEqual(['choose-one', 'make']);
      expect(kinds(lesson.plan.guided), lesson.id).toEqual(['choose-one', 'make']);
      const alone = kinds(lesson.plan.independent.pool);
      expect(alone.filter((kind) => kind === 'make').length, lesson.id).toBeGreaterThanOrEqual(4);
      expect(
        alone.filter((kind) => kind === 'choose-one').length,
        lesson.id,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  it('asks, over a lesson, about every way a thing can turn out', () => {
    const seen = new Map<string, Set<string>>();
    for (const lesson of pack.lessons) {
      for (const asked of lesson.challenges) {
        if (asked.kind !== 'choose-one' || asked.prompt.stimulus.type !== 'scene') continue;
        const { scene, of } = asked.prompt.stimulus;
        const happens = testSetup(scene, of as Record<string, string | number>)?.outcome ?? '';
        seen.set(scene, (seen.get(scene) ?? new Set()).add(happens));
      }
    }
    const asked = (scene: string) => [...(seen.get(scene) ?? [])].sort();
    expect(asked('bridge')).toEqual([...(OUTCOMES.bridge ?? [])].sort());
    expect(asked('ramp')).toEqual([...(OUTCOMES.ramp ?? [])].sort());
    expect(asked('balance')).toEqual([...(OUTCOMES.balance ?? [])].sort());
    expect(asked('tub')).toEqual([...(OUTCOMES.tub ?? [])].sort());
    // A boat that is guessed about carries everything, so it floats or it sinks.
    expect(asked('boat')).toEqual(['floated', 'sank']);
  });

  it('does not let "it works" be the answer nearly always, or nearly never', () => {
    for (const lesson of pack.lessons) {
      const guesses = lesson.challenges.filter((asked) => asked.kind === 'choose-one');
      const working = guesses.filter((asked) => {
        if (asked.prompt.stimulus.type !== 'scene') return false;
        const { scene, of } = asked.prompt.stimulus;
        return testSetup(scene, of as Record<string, string | number>)?.works === true;
      });
      expect(working.length / guesses.length, lesson.id).toBeGreaterThanOrEqual(0.3);
      expect(working.length / guesses.length, lesson.id).toBeLessThanOrEqual(0.7);
    }
  });

  it('says every line a small child hears in a few plain words', () => {
    for (const [key, line] of Object.entries(pack.strings.en)) {
      expect(line.length, key).toBeLessThanOrEqual(70);
      for (const sentence of line.split(/[.!?]/).filter((part) => part.trim() !== '')) {
        expect(sentence.trim().split(/\s+/).length, `${key}: ${sentence}`).toBeLessThanOrEqual(10);
      }
    }
  });
});

describe('every Inventor Island rule fires', () => {
  const BREAK: Record<string, (pack: Loose) => void> = {
    'guess-given-away': (pack) => {
      guess(pack).prompt.stimulus.of.shown = 'held';
    },
    'setup-malformed': (pack) => {
      guess(pack).prompt.stimulus.of.traveller = 'ox';
    },
    'guess-choice-setup': (pack) => {
      guess(pack).choices[0].stimulus.of.plank = 'thick';
    },
    'guess-outcome-unknown': (pack) => {
      guess(pack).choices[0].stimulus.of.shown = 'exploded';
    },
    'guess-outcome-duplicate': (pack) => {
      guess(pack).choices[0].stimulus.of.shown = guess(pack).choices[1].stimulus.of.shown;
    },
    'guess-answer-wrong': (pack) => {
      guess(pack).answer = 'a';
    },
    'misconception-missing': (pack) => {
      delete threeWays(pack).misconceptions;
    },
    'misconception-wrong': (pack) => {
      threeWays(pack).misconceptions = { a: 'predicted-landed', c: 'predicted-landed' };
    },
    'inventor-island-task': (pack) => {
      mend(pack).task = {
        type: 'order',
        cards: [
          { id: 'a', label: 'first', stimulus: { type: 'picture', id: 'seed' } },
          { id: 'b', label: 'next', stimulus: { type: 'picture', id: 'sprout' } },
        ],
        solution: ['a', 'b'],
      };
    },
    'inventor-island-question': (pack) => {
      guess(pack).prompt.stimulus = { type: 'picture', id: 'sun' };
    },
    'design-control-unknown': (pack) => {
      mend(pack).task.controls[0].id = 'paint';
    },
    'design-option-unknown': (pack) => {
      mend(pack).task.controls[0].options = ['thin', 'steel'];
    },
    'design-start-unbuildable': (pack) => {
      mend(pack).task.controls[1].options = ['one', 'two'];
    },
    'design-start-works': (pack) => {
      mend(pack).task.given.plank = 'thick';
      mend(pack).prompt.stimulus.of.plank = 'thick';
    },
    'design-picture': (pack) => {
      mend(pack).prompt.stimulus.of.gap = 4;
    },
  };

  it('the cases below break what they think they break', () => {
    const pack = inventorIslandPack() as unknown as Loose;
    expect(guess(pack).prompt.stimulus.of).toEqual({
      gap: 2,
      traveller: 'goat',
      plank: 'thin',
      posts: 'none',
    });
    expect(guess(pack).choices.map((choice: Loose) => choice.stimulus.of.shown)).toEqual([
      'held',
      'sagged',
    ]);
    expect(guess(pack).answer).toBe('b');
    expect(mend(pack).task).toMatchObject({
      type: 'design',
      model: 'bridge',
      solution: ['thick', 'none'],
    });
    expect(threeWays(pack).choices).toHaveLength(3);
    expect(threeWays(pack).answer).toBe('b');
  });

  it.each(Object.keys(BREAK))('%s', (code) => {
    expect(codes(broken(BREAK[code]!))).toContain(code);
  });

  it('a mend that cannot be tested as it stands is refused too', () => {
    const issues = broken((pack) => {
      mend(pack).task.given.gap = 9;
    });
    expect(codes(issues)).toContain('setup-malformed');
  });

  it('a mend with no picture of what is to be mended is refused', () => {
    const issues = broken((pack) => {
      delete mend(pack).prompt.stimulus;
    });
    expect(codes(issues)).toContain('design-picture');
  });

  it('a row that says the wrong thing happens is caught, whichever way it is wrong', () => {
    // Every guess in the pack, with its answer moved to each other choice in turn.
    const pack = inventorIslandPack();
    let tried = 0;
    pack.lessons.forEach((lesson, lessonIndex) => {
      lesson.challenges.forEach((asked, index) => {
        if (asked.kind !== 'choose-one') return;
        for (const choice of asked.choices) {
          if (choice.id === asked.answer) continue;
          const issues = broken((copy) => {
            challenge(copy, lessonIndex, index).answer = choice.id;
          });
          expect(codes(issues), `${asked.id} → ${choice.id}`).toContain('guess-answer-wrong');
          tried += 1;
        }
      });
    });
    expect(tried).toBeGreaterThan(30);
  });

  it('a mend whose answer does not work, or that has nothing wrong with it, is caught for every one', () => {
    const pack = inventorIslandPack();
    let tried = 0;
    pack.lessons.forEach((lesson, lessonIndex) => {
      lesson.challenges.forEach((asked, index) => {
        if (asked.kind !== 'make' || asked.task.type !== 'design') return;
        const { task } = asked;
        const start = task.controls.map((control) => task.given[control.id]);
        // The design it starts with, put forward as the answer: the lint for every pack catches that.
        const unmended = broken((copy) => {
          challenge(copy, lessonIndex, index).task.solution = start;
        });
        expect(codes(unmended), asked.id).toContain('design-solution-wrong');
        // The answer, handed over as the start: there is nothing left to mend.
        const done = broken((copy) => {
          const copied = challenge(copy, lessonIndex, index).task;
          copied.controls.forEach((control: Loose, at: number) => {
            copied.given[control.id] = copied.solution[at];
          });
        });
        expect(codes(done), asked.id).toContain('design-start-works');
        tried += 1;
      });
    });
    expect(tried).toBe(24);
  });

  it('has a case here for every rule Inventor Island has', async () => {
    const source = (await import('@/content/rules/inventorIsland.ts?raw')).default;
    expect(rulesIn(source)).toEqual(Object.keys(BREAK).sort());
  });

  it('names a guess that did not come true by what was guessed', () => {
    expect(guessMisconception('held')).toBe('predicted-held');
    expect(guessMisconception('rolled-past')).toBe('predicted-rolled-past');
  });
});
