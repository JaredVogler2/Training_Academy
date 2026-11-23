import { describe, expect, it } from 'vitest';
import robotRidge from '@/content/packs/robot-ridge.v1.json';
import { lintPack, type LintIssue } from '@/content/lint';
import {
  MOST_PLACES,
  MOST_PLACES_AGAIN,
  MOST_ROWS,
  POWER_TO_SPARE,
  kindOf,
  sceneOf,
} from '@/content/rules/robotRidge';
import { parseContentPack, type ContentPack } from '@/engine';

/**
 * Robot Ridge's own rules: what makes each kind of journey teach what its activity says it teaches. Every rule is
 * shown to fire on a copy of the real pack broken in exactly that way, and the last test reads the rules' own
 * source, so a rule added without a case here fails the suite.
 */

function robotRidgePack(): ContentPack {
  const parsed = parseContentPack(robotRidge);
  if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
  return parsed.value;
}

/**
 * A pack to break on purpose. It is handed over untyped: the point is to write what the types would refuse, and
 * see that the lint refuses it too.
 */
type Loose = Record<string, any>;

const codes = (issues: LintIssue[]) => issues.map((issue) => issue.code);

function broken(mutate: (pack: Loose) => void): LintIssue[] {
  const pack = structuredClone(robotRidgePack());
  mutate(pack);
  return lintPack(pack);
}

/** A challenge of the pack by the end of its name, whichever activity it is in. */
const journey = (pack: Loose, name: string): Loose => {
  for (const lesson of pack.lessons) {
    const found = lesson.challenges.find((challenge: Loose) => challenge.id.endsWith(`.${name}`));
    if (found) return found;
  }
  throw new Error(`No journey called ${name}.`);
};

/** The names of the rules a source file can report: every hyphenated word in quotes that is not known data. */
function rulesIn(source: string, data: readonly string[] = []): string[] {
  return [...new Set([...source.matchAll(/'([a-z]+(?:-[a-z]+)+)'/g)].map((match) => match[1]!))]
    .filter((name) => !data.includes(name))
    .sort();
}

describe('the pack as it is shipped', () => {
  it('breaks none of Robot Ridge’s rules, nor any other', () => {
    expect(lintPack(robotRidgePack())).toEqual([]);
  });

  it('has the journeys the cases below take for granted', () => {
    const pack = robotRidgePack() as unknown as Loose;
    expect(journey(pack, 'two-along').task).toMatchObject({
      live: true,
      slots: 4,
      solution: 'f-f',
    });
    expect(journey(pack, 'guided-two-along').task).toMatchObject({ live: false, slots: 3 });
    expect(journey(pack, 'guided-two-twice').task).toMatchObject({
      slots: 2,
      repeats: 2,
      solution: 'x2-f-f',
    });
    expect(journey(pack, 'demo-wrong-turn').task).toMatchObject({
      given: 'f-l-f',
      solution: 'f-r-f',
      slots: 3,
    });
  });
});

describe('what a journey is for', () => {
  it('is told from how it is set up', () => {
    const pack = robotRidgePack() as unknown as Loose;
    expect(kindOf(journey(pack, 'two-along').task)).toBe('live');
    expect(kindOf(journey(pack, 'guided-two-along').task)).toBe('plan');
    expect(kindOf(journey(pack, 'guided-two-twice').task)).toBe('again');
    expect(kindOf(journey(pack, 'demo-wrong-turn').task)).toBe('mend');
  });

  it('is said by its picture, with the grid the picture is of', () => {
    const pack = robotRidgePack() as unknown as Loose;
    const task = journey(pack, 'went-straight-into-a-rock').task;
    expect(sceneOf(task)).toEqual({
      type: 'scene',
      scene: 'grid',
      of: {
        game: 'mend',
        columns: 3,
        rows: 2,
        start: [0, 1],
        facing: 'east',
        goal: [1, 0],
        rocks: [2, 1],
      },
    });
  });
});

describe('every Robot Ridge rule fires', () => {
  const live = (pack: Loose) => journey(pack, 'two-along');
  const plan = (pack: Loose) => journey(pack, 'guided-two-along');
  const again = (pack: Loose) => journey(pack, 'guided-two-twice');
  const mend = (pack: Loose) => journey(pack, 'demo-wrong-turn');

  const BREAK: Record<string, (pack: Loose) => void> = {
    'robot-question': (pack) => {
      plan(pack).task = {
        type: 'give',
        want: { type: 'quantity', item: 'snail', count: 2, arrangement: 'row' },
        item: 'leaf',
        pile: 5,
        places: true,
      };
    },
    'robot-scene': (pack) => {
      plan(pack).prompt.stimulus.of.goal = [1, 0];
    },
    'robot-no-forward': (pack) => {
      plan(pack).task.commands = ['left', 'right'];
    },
    'robot-skill': (pack) => {
      live(pack).skillId = 'coding.sequence.plan-short';
    },
    'robot-step-hint': (pack) => {
      mend(pack).hints.splice(1, 0, { type: 'step', count: 1, caption: 'rr.steps.hint.step' });
    },
    'robot-too-tall': (pack) => {
      plan(pack).task.grid.rows = MOST_ROWS + 1;
    },
    'robot-row-too-long': (pack) => {
      plan(pack).task.slots = MOST_PLACES + 1;
    },
    'robot-live-plain': (pack) => {
      live(pack).task.repeats = 2;
    },
    'robot-live-power': (pack) => {
      live(pack).task.slots = 2 + POWER_TO_SPARE + 1;
    },
    'robot-slots-loose': (pack) => {
      plan(pack).task.slots = 4;
    },
    'robot-again-not-shown': (pack) => {
      again(pack).task.slots = 4;
      again(pack).task.solution = 'f-f-f-f';
    },
    'robot-again-unneeded': (pack) => {
      again(pack).task.slots = 4;
    },
    'robot-mend-again': (pack) => {
      mend(pack).task.repeats = 2;
    },
    'robot-mend-slots': (pack) => {
      mend(pack).task.slots = 4;
    },
    'robot-mend-distance': (pack) => {
      mend(pack).task.given = 'l-l-f';
    },
  };

  it.each(Object.keys(BREAK))('%s', (code) => {
    expect(codes(broken(BREAK[code]!))).toContain(code);
  });

  it('the picture is checked whatever order it says things in, and whatever it leaves out', () => {
    // The same picture, said backwards, is the same picture.
    const reordered = broken((pack) => {
      const { stimulus } = plan(pack).prompt;
      stimulus.of = Object.fromEntries(Object.entries(stimulus.of).reverse());
    });
    expect(codes(reordered)).not.toContain('robot-scene');
    // A picture of the wrong game, of no game, or no picture at all, is not.
    for (const mutate of [
      (pack: Loose) => (plan(pack).prompt.stimulus.of.game = 'mend'),
      (pack: Loose) => delete plan(pack).prompt.stimulus.of.game,
      (pack: Loose) => delete plan(pack).prompt.stimulus,
      (pack: Loose) => (plan(pack).prompt.stimulus = { type: 'picture', id: 'sun' }),
    ]) {
      expect(codes(broken(mutate))).toContain('robot-scene');
    }
  });

  it('power to spare is counted from the shortest way, not from the way shown', () => {
    // A longer way shown does not buy more power: the journey is still two steps.
    const issues = broken((pack) => {
      live(pack).task.slots = 2 + POWER_TO_SPARE;
    });
    expect(codes(issues)).not.toContain('robot-live-power');
  });

  it('a grid may be as tall as fits a phone held sideways, and no taller', () => {
    const tall = (rows: number) =>
      codes(
        broken((pack) => {
          plan(pack).task.grid.rows = rows;
        }),
      );
    expect(tall(MOST_ROWS)).not.toContain('robot-too-tall');
    expect(tall(MOST_ROWS + 1)).toContain('robot-too-tall');
  });

  it('a row may have as many places as can each be pressed: one fewer beside the again button', () => {
    const long = (which: (pack: Loose) => Loose, slots: number) =>
      codes(
        broken((pack) => {
          which(pack).task.slots = slots;
        }),
      );
    expect(long(plan, MOST_PLACES)).not.toContain('robot-row-too-long');
    expect(long(plan, MOST_PLACES + 1)).toContain('robot-row-too-long');
    expect(long(mend, MOST_PLACES + 1)).toContain('robot-row-too-long');
    expect(long(again, MOST_PLACES_AGAIN)).not.toContain('robot-row-too-long');
    expect(long(again, MOST_PLACES_AGAIN + 1)).toContain('robot-row-too-long');
    // Power is looked at, not pressed: it may be as long as the journey needs.
    expect(long(live, MOST_PLACES + 3)).not.toContain('robot-row-too-long');
  });

  it('the pack keeps inside both, with a journey at each limit', () => {
    const tasks = robotRidgePack().lessons.flatMap((lesson) =>
      lesson.challenges.flatMap((challenge) =>
        challenge.kind === 'make' && challenge.task.type === 'program' ? [challenge.task] : [],
      ),
    );
    expect(Math.max(...tasks.map((task) => task.grid.rows))).toBe(MOST_ROWS);
    const rows = (kind: ReturnType<typeof kindOf>) =>
      Math.max(...tasks.filter((task) => kindOf(task) === kind).map((task) => task.slots));
    expect(rows('mend')).toBe(MOST_PLACES);
    expect(rows('again')).toBe(MOST_PLACES_AGAIN);
    expect(rows('plan')).toBeLessThanOrEqual(MOST_PLACES);
  });

  it('has a case here for every rule Robot Ridge has', async () => {
    const source = (await import('@/content/rules/robotRidge.ts?raw')).default;
    expect(rulesIn(source)).toEqual(Object.keys(BREAK).sort());
  });
});
