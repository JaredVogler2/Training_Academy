import { describe, expect, it } from 'vitest';
import robotRidge from '@/content/packs/robot-ridge.v2.json';
import { lintPack, type LintIssue } from '@/content/lint';
import {
  LONG_FROM,
  LONG_TO,
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
    // A longer plan: up, across and up again, between two rocks.
    expect(journey(pack, 'guided-five').task).toMatchObject({
      stepwise: true,
      grid: { columns: 3, rows: 3 },
      start: { at: [0, 2], facing: 'north' },
      goal: [1, 0],
      slots: 5,
      solution: 'f-r-f-l-f',
    });
    // A bridge straight ahead, one square off, along the top of the ground, with water below it.
    expect(journey(pack, 'demo-across').task).toMatchObject({
      grid: { columns: 4, rows: 2 },
      start: { at: [0, 0], facing: 'east' },
      goal: [3, 0],
      water: [[2, 1]],
      bridges: [[2, 0]],
      whenRight: ['up'],
      slots: 4,
      solution: 'f-w-f-f',
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
    expect(kindOf(journey(pack, 'guided-five').task)).toBe('long');
    expect(kindOf(journey(pack, 'demo-across').task)).toBe('bridge');
  });

  it('is one thing only: what a row is given to mend, or done over, comes before what else it has', () => {
    const pack = robotRidgePack() as unknown as Loose;
    const { task } = journey(pack, 'demo-across');
    expect(kindOf({ ...task, live: true })).toBe('live');
    expect(kindOf({ ...task, given: 'f-f-f-f' })).toBe('mend');
    expect(kindOf({ ...task, repeats: 2 })).toBe('again');
    expect(kindOf({ ...task, stepwise: true })).toBe('bridge');
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

  it('is said with its river and its bridge, where it has them, and with no word of them where it has not', () => {
    const pack = robotRidgePack() as unknown as Loose;
    expect(sceneOf(journey(pack, 'demo-across').task).of).toEqual({
      game: 'bridge',
      columns: 4,
      rows: 2,
      start: [0, 0],
      facing: 'east',
      goal: [3, 0],
      rocks: [],
      water: [2, 1],
      bridges: [2, 0],
    });
    const long = sceneOf(journey(pack, 'guided-five').task).of;
    expect(long.game).toBe('long');
    expect(Object.keys(long)).not.toContain('water');
    expect(Object.keys(long)).not.toContain('bridges');
  });
});

describe('every Robot Ridge rule fires', () => {
  const live = (pack: Loose) => journey(pack, 'two-along');
  const plan = (pack: Loose) => journey(pack, 'guided-two-along');
  const again = (pack: Loose) => journey(pack, 'guided-two-twice');
  const mend = (pack: Loose) => journey(pack, 'demo-wrong-turn');
  const longer = (pack: Loose) => journey(pack, 'guided-five');
  const bridge = (pack: Loose) => journey(pack, 'demo-across');
  /** A journey changed, with its picture changed to match: so that only the rule meant is broken. */
  const remade = (challenge: Loose, task: Loose) => {
    Object.assign(challenge.task, task);
    challenge.prompt.stimulus = sceneOf(challenge.task);
  };

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
    'robot-long-short': (pack) => {
      // The star one square nearer: up, turn, across. Three steps is a short plan.
      remade(longer(pack), { goal: [1, 1], slots: 3, solution: 'f-r-f' });
    },
    'robot-long-places': (pack) => {
      longer(pack).task.slots = 6;
    },
    'robot-long-many-ways': (pack) => {
      // A rock straight ahead, and as far round it one way as the other.
      remade(longer(pack), {
        start: { at: [1, 2], facing: 'north' },
        goal: [1, 0],
        rocks: [[1, 1]],
        slots: 7,
        solution: 'l-f-r-f-f-r-f',
      });
    },
    'robot-bridge-waits': (pack) => {
      // A wait too many: one at the start, where there is nothing to wait for.
      remade(bridge(pack), { slots: 5, solution: 'w-f-w-f-f' });
    },
    'robot-bridge-unneeded': (pack) => {
      // The star on the near bank: the bridge is not on the way to it.
      remade(bridge(pack), { goal: [1, 1] });
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
    // A longer plan's tiles are looked at too, and a row holds ten of them. A bridge's row is pressed.
    expect(long(longer, LONG_TO)).not.toContain('robot-row-too-long');
    expect(long(longer, LONG_TO + 1)).toContain('robot-row-too-long');
    expect(long(bridge, MOST_PLACES + 1)).toContain('robot-row-too-long');
  });

  it('a longer plan has only itself to blame for a loose row: its rule is its own, and exact', () => {
    // One place more than the way needs would pass for a short plan. Not for a long one.
    const loose = codes(
      broken((pack) => {
        longer(pack).task.slots = 6;
      }),
    );
    expect(loose).toContain('robot-long-places');
    expect(loose).not.toContain('robot-slots-loose');
    // And one place fewer than the way needs cannot hold the answer: the general lint says that.
    expect(
      codes(
        broken((pack) => {
          longer(pack).task.slots = 4;
        }),
      ),
    ).toContain('program-solution-unbuildable');
  });

  it('a bridge that can be gone round is refused even where the way round is the long one', () => {
    // The water under the bridge is somewhere else: the robot can go down, along and up, in twice the steps.
    const issues = broken((pack) => {
      remade(bridge(pack), { water: [[0, 1]], slots: 8, solution: 'f-w-f-f' });
    });
    expect(codes(issues)).toContain('robot-bridge-unneeded');
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
    expect(rows('bridge')).toBe(MOST_PLACES);
    // The longer plans go from the shortest a long one may be to the longest a row holds.
    const longs = tasks.filter((task) => kindOf(task) === 'long').map((task) => task.slots);
    expect(Math.min(...longs)).toBe(LONG_FROM);
    expect(Math.max(...longs)).toBe(LONG_TO);
    expect(new Set(longs)).toEqual(new Set([4, 5, 6, 7, 8, 9, 10]));
  });

  it('has a case here for every rule Robot Ridge has', async () => {
    const source = (await import('@/content/rules/robotRidge.ts?raw')).default;
    expect(rulesIn(source)).toEqual(Object.keys(BREAK).sort());
  });
});
