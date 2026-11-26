import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  BOATS,
  CONTROLS,
  COUNTS,
  DROPPED,
  GAPS,
  HEIGHTS,
  MODELS,
  OUTCOMES,
  PLACES,
  PLANKS,
  POSTS,
  PROPS,
  SHELTERED,
  SIDES,
  SURFACES,
  TRAVELLERS,
  WALLS,
  WINDS,
  leeOf,
  rampReach,
  setupProblem,
  startingDesign,
  testDesign,
  testSetup,
  type DesignTask,
  type Setup,
} from '@/engine';

/**
 * The workbench models. Three kinds of test:
 *
 *   fixtures     set-ups worked out by hand, each with what must happen: the models are held to them
 *   directions   a change that should help never hurts, and one that should hurt never helps — for every set-up
 *   repeatable   the same set-up always does the same thing
 *
 * None of this says the models are true to the world. It says they are coherent, and that they are what the
 * comments beside them claim.
 */

const outcome = (scene: string, setup: Setup) => testSetup(scene, setup)?.outcome;
const works = (scene: string, setup: Setup) => testSetup(scene, setup)?.works;

const travellers = Object.keys(TRAVELLERS);
const planks = Object.keys(PLANKS);
const posts = Object.keys(POSTS);
const heights = Object.keys(HEIGHTS);
const counts = Object.keys(COUNTS);
const places = Object.keys(PLACES);
const boats = Object.keys(BOATS);
const things = Object.keys(DROPPED);

const bridges = fc.record({
  gap: fc.constantFrom(...GAPS),
  traveller: fc.constantFrom(...travellers),
  plank: fc.constantFrom(...planks),
  posts: fc.constantFrom(...posts),
});
const ramps = fc.record({
  target: fc.integer({ min: 1, max: 6 }),
  height: fc.constantFrom(...heights),
  surface: fc.constantFrom(...SURFACES),
});
const beams = fc.record({
  leftWeight: fc.integer({ min: 1, max: 3 }),
  leftAt: fc.integer({ min: 1, max: 3 }),
  weight: fc.constantFrom(...counts),
  at: fc.constantFrom(...places),
});
const ponds = fc.record({
  need: fc.integer({ min: 1, max: 3 }),
  boat: fc.constantFrom(...boats),
  cargo: fc.constantFrom(...counts),
});
const winds = Object.keys(WINDS);
const walls = Object.keys(WALLS);
const plants = Object.keys(SHELTERED);
const shelters = fc.record({
  wind: fc.constantFrom(...winds),
  from: fc.constantFrom(...SIDES),
  plant: fc.constantFrom(...plants),
  wall: fc.constantFrom(...walls),
  prop: fc.constantFrom(...PROPS),
});

/** The value one step up from this one in a list, or the same value at the top of it. */
const stepUp = (list: readonly string[], value: string): string =>
  list[Math.min(list.length - 1, list.indexOf(value) + 1)] ?? value;

describe('the bridge', () => {
  it.each([
    // gap, traveller, plank, posts, what happens
    [2, 'rabbit', 'thin', 'none', 'held'],
    [2, 'goat', 'thin', 'none', 'sagged'],
    [2, 'goat', 'thick', 'none', 'held'],
    [2, 'goat', 'thin', 'one', 'held'],
    [2, 'bear', 'thin', 'one', 'sagged'],
    [2, 'bear', 'thin', 'two', 'held'],
    [2, 'bear', 'thick', 'none', 'sagged'],
    [2, 'bear', 'thick', 'one', 'held'],
    [3, 'rabbit', 'thin', 'none', 'sagged'],
    [3, 'rabbit', 'thick', 'none', 'held'],
    [3, 'goat', 'thick', 'none', 'sagged'],
    [3, 'goat', 'thick', 'one', 'held'],
    [3, 'goat', 'thin', 'two', 'held'],
    [3, 'bear', 'thick', 'one', 'sagged'],
    [3, 'bear', 'thick', 'two', 'held'],
    [4, 'rabbit', 'thin', 'none', 'sagged'],
    [4, 'rabbit', 'thin', 'one', 'held'],
    [4, 'goat', 'thin', 'two', 'sagged'],
    [4, 'goat', 'thick', 'one', 'held'],
    [4, 'bear', 'thick', 'two', 'held'],
  ] as const)(
    'a gap of %i, a %s, a %s plank, posts %s: %s',
    (gap, traveller, plank, posts, result) => {
      expect(outcome('bridge', { gap, traveller, plank, posts })).toBe(result);
    },
  );

  it('never does worse for a thicker plank or one more post', () => {
    fc.assert(
      fc.property(bridges, (setup) => {
        if (!works('bridge', setup)) return;
        expect(works('bridge', { ...setup, plank: stepUp(planks, setup.plank) })).toBe(true);
        expect(works('bridge', { ...setup, posts: stepUp(posts, setup.posts) })).toBe(true);
      }),
    );
  });

  it('never does better for a heavier traveller or a wider gap', () => {
    fc.assert(
      fc.property(bridges, (setup) => {
        if (works('bridge', setup)) return;
        expect(works('bridge', { ...setup, traveller: stepUp(travellers, setup.traveller) })).toBe(
          false,
        );
        expect(works('bridge', { ...setup, gap: Math.min(4, setup.gap + 1) })).toBe(false);
      }),
    );
  });

  it('can always be made to hold, and never holds for everyone with the least', () => {
    for (const gap of GAPS) {
      for (const traveller of travellers) {
        expect(works('bridge', { gap, traveller, plank: 'thick', posts: 'two' })).toBe(true);
      }
      expect(works('bridge', { gap, traveller: 'bear', plank: 'thin', posts: 'none' })).toBe(false);
    }
  });
});

describe('the ramp', () => {
  it('rolls a ball further from higher up, and half as far on rough ground', () => {
    expect(heights.map((height) => rampReach(height, 'smooth'))).toEqual([2, 4, 6]);
    expect(heights.map((height) => rampReach(height, 'rough'))).toEqual([1, 2, 3]);
  });

  it.each([
    // star, height, ground, what happens
    [4, 'mid', 'smooth', 'landed'],
    [4, 'low', 'smooth', 'rolled-short'],
    [4, 'high', 'smooth', 'rolled-past'],
    [2, 'high', 'rough', 'rolled-past'],
    [2, 'mid', 'rough', 'landed'],
    [3, 'high', 'rough', 'landed'],
    [6, 'high', 'smooth', 'landed'],
    [6, 'high', 'rough', 'rolled-short'],
    [1, 'low', 'rough', 'landed'],
  ] as const)('the star on %i, a %s ramp, %s ground: %s', (target, height, surface, result) => {
    expect(outcome('ramp', { target, height, surface })).toBe(result);
  });

  it('never rolls less far for being higher, or further for rougher ground', () => {
    for (const surface of SURFACES) {
      const reaches = heights.map((height) => rampReach(height, surface));
      expect(reaches).toEqual([...reaches].sort((a, b) => a - b));
    }
    for (const height of heights) {
      expect(rampReach(height, 'rough')).toBeLessThan(rampReach(height, 'smooth'));
    }
  });

  it('stops short, on the star or past it according to how far it rolls, and no other way', () => {
    fc.assert(
      fc.property(ramps, (setup) => {
        const reach = rampReach(setup.height, setup.surface);
        const expected =
          reach === setup.target ? 'landed' : reach < setup.target ? 'rolled-short' : 'rolled-past';
        expect(outcome('ramp', setup)).toBe(expected);
        expect(works('ramp', setup)).toBe(reach === setup.target);
      }),
    );
  });

  it('cannot put a ball on the fifth length at all: no ramp here rolls that far and no further', () => {
    for (const height of heights) {
      for (const surface of SURFACES) {
        expect(works('ramp', { target: 5, height, surface })).toBe(false);
      }
    }
  });
});

describe('the balance', () => {
  it.each([
    // blocks on the left, how far out, blocks on the right, where, what happens
    [1, 2, 'one', 'mid', 'balanced'],
    [2, 2, 'one', 'mid', 'tipped-left'],
    [1, 3, 'one', 'near', 'tipped-left'],
    [1, 3, 'three', 'near', 'balanced'],
    [2, 1, 'one', 'far', 'tipped-right'],
    [3, 1, 'two', 'mid', 'tipped-right'],
    [3, 2, 'two', 'far', 'balanced'],
    [2, 3, 'three', 'mid', 'balanced'],
    [3, 3, 'three', 'far', 'balanced'],
    [1, 1, 'one', 'near', 'balanced'],
  ] as const)('%i at %i against %s at %s: %s', (leftWeight, leftAt, weight, at, result) => {
    expect(outcome('balance', { leftWeight, leftAt, weight, at })).toBe(result);
  });

  it('is the same seen from the other side: swap the two stacks and it tips the other way', () => {
    const mirror: Record<string, string> = {
      balanced: 'balanced',
      'tipped-left': 'tipped-right',
      'tipped-right': 'tipped-left',
    };
    fc.assert(
      fc.property(beams, (setup) => {
        const swapped = {
          leftWeight: COUNTS[setup.weight] ?? 0,
          leftAt: PLACES[setup.at] ?? 0,
          weight: counts[setup.leftWeight - 1] ?? '',
          at: places[setup.leftAt - 1] ?? '',
        };
        expect(outcome('balance', swapped)).toBe(mirror[outcome('balance', setup) ?? '']);
      }),
    );
  });

  it('never tips further to the left for one more block on the right, or for moving it further out', () => {
    const lean: Record<string, number> = { 'tipped-left': -1, balanced: 0, 'tipped-right': 1 };
    const leaning = (setup: Setup) => lean[outcome('balance', setup) ?? ''] ?? Number.NaN;
    fc.assert(
      fc.property(beams, (setup) => {
        expect(leaning({ ...setup, weight: stepUp(counts, setup.weight) })).toBeGreaterThanOrEqual(
          leaning(setup),
        );
        expect(leaning({ ...setup, at: stepUp(places, setup.at) })).toBeGreaterThanOrEqual(
          leaning(setup),
        );
      }),
    );
  });

  it('can always be balanced by the same blocks at the same distance', () => {
    for (let leftWeight = 1; leftWeight <= 3; leftWeight++) {
      for (let leftAt = 1; leftAt <= 3; leftAt++) {
        const mirror = { weight: counts[leftWeight - 1] ?? '', at: places[leftAt - 1] ?? '' };
        expect(works('balance', { leftWeight, leftAt, ...mirror })).toBe(true);
      }
    }
  });
});

describe('the boat', () => {
  it.each([
    // stones waiting, boat, stones aboard, what happens
    [2, 'shell', 'one', 'left-behind'],
    [2, 'shell', 'two', 'sank'],
    [2, 'bark', 'two', 'floated'],
    [2, 'bark', 'one', 'left-behind'],
    [2, 'raft', 'two', 'floated'],
    [3, 'bark', 'three', 'sank'],
    [3, 'raft', 'three', 'floated'],
    [3, 'raft', 'two', 'left-behind'],
    [1, 'shell', 'one', 'floated'],
  ] as const)('%i waiting, the %s, %s aboard: %s', (need, boat, cargo, result) => {
    expect(outcome('boat', { need, boat, cargo })).toBe(result);
  });

  it('carries in a bigger boat whatever a smaller one carries', () => {
    fc.assert(
      fc.property(ponds, (setup) => {
        if (outcome('boat', setup) === 'sank') return;
        expect(outcome('boat', { ...setup, boat: stepUp(boats, setup.boat) })).not.toBe('sank');
      }),
    );
  });

  it('never floats again for one more stone aboard', () => {
    fc.assert(
      fc.property(ponds, (setup) => {
        if (outcome('boat', setup) !== 'sank') return;
        expect(outcome('boat', { ...setup, cargo: stepUp(counts, setup.cargo) })).toBe('sank');
      }),
    );
  });

  it('works only when it floats and nothing is left behind', () => {
    fc.assert(
      fc.property(ponds, (setup) => {
        const aboard = COUNTS[setup.cargo] ?? 0;
        const floats = aboard <= (BOATS[setup.boat] ?? 0);
        expect(works('boat', setup)).toBe(floats && aboard >= setup.need);
      }),
    );
  });
});

describe('the shelter', () => {
  it.each([
    // wind, where it blows from, what is behind the wall, the wall, the prop, what happens
    ['breeze', 'left', 'seedling', 'low', 'none', 'sheltered'],
    ['breeze', 'left', 'seedling', 'tall', 'none', 'blew-over'],
    ['breeze', 'left', 'seedling', 'tall', 'right', 'sheltered'],
    ['breeze', 'left', 'seedling', 'tall', 'left', 'blew-over'],
    ['breeze', 'left', 'sunflower', 'low', 'none', 'too-low'],
    ['breeze', 'left', 'sunflower', 'tall', 'right', 'sheltered'],
    ['gust', 'left', 'seedling', 'low', 'none', 'blew-over'],
    ['gust', 'left', 'seedling', 'low', 'right', 'sheltered'],
    ['gust', 'left', 'seedling', 'low', 'left', 'blew-over'],
    ['gust', 'left', 'sunflower', 'low', 'right', 'too-low'],
    ['gust', 'left', 'sunflower', 'tall', 'right', 'sheltered'],
    ['gust', 'left', 'sunflower', 'tall', 'none', 'blew-over'],
    ['gust', 'right', 'seedling', 'low', 'left', 'sheltered'],
    ['gust', 'right', 'seedling', 'low', 'right', 'blew-over'],
    ['breeze', 'right', 'sunflower', 'tall', 'left', 'sheltered'],
    ['breeze', 'right', 'sunflower', 'tall', 'right', 'blew-over'],
  ] as const)(
    'a %s from the %s on a %s behind a %s wall, prop: %s — %s',
    (wind, from, plant, wall, prop, result) => {
      expect(outcome('shelter', { wind, from, plant, wall, prop })).toBe(result);
    },
  );

  it('is the same thing seen in a mirror: turn the wind and the prop round and nothing changes', () => {
    const turned = (side: string) => (side === 'none' ? side : leeOf(side));
    fc.assert(
      fc.property(shelters, (setup) => {
        const mirror = { ...setup, from: leeOf(setup.from), prop: turned(setup.prop) };
        expect(outcome('shelter', mirror)).toBe(outcome('shelter', setup));
      }),
    );
  });

  it('always stands with a prop on the side away from the wind, whatever the wind and the wall', () => {
    fc.assert(
      fc.property(shelters, (setup) => {
        const propped = { ...setup, prop: leeOf(setup.from) };
        expect(outcome('shelter', propped)).not.toBe('blew-over');
      }),
    );
  });

  it('gets nothing from a prop on the side the wind comes from: it does what it does with none', () => {
    fc.assert(
      fc.property(shelters, (setup) => {
        const windward = { ...setup, prop: setup.from };
        expect(outcome('shelter', windward)).toBe(outcome('shelter', { ...setup, prop: 'none' }));
      }),
    );
  });

  it('never stands in a stronger wind where it fell in a weaker, or as a taller wall where a lower fell', () => {
    fc.assert(
      fc.property(shelters, (setup) => {
        if (outcome('shelter', setup) !== 'blew-over') return;
        expect(outcome('shelter', { ...setup, wind: stepUp(winds, setup.wind) })).toBe('blew-over');
        expect(outcome('shelter', { ...setup, wall: stepUp(walls, setup.wall) })).toBe('blew-over');
      }),
    );
  });

  it('shelters only when it stands and is as tall as what is behind it', () => {
    fc.assert(
      fc.property(shelters, (setup) => {
        const result = outcome('shelter', setup);
        const tallEnough = (WALLS[setup.wall] ?? 0) >= (SHELTERED[setup.plant] ?? 0);
        expect(works('shelter', setup)).toBe(result !== 'blew-over' && tallEnough);
        // What is too low is never said of a wall that is tall enough, or of one that fell.
        if (result === 'too-low') expect(tallEnough).toBe(false);
      }),
    );
  });

  it('can always be made to shelter: a wall as tall as the plant, propped on the side away from the wind', () => {
    for (const wind of winds) {
      for (const from of SIDES) {
        for (const plant of plants) {
          const wall = plant === 'sunflower' ? 'tall' : 'low';
          expect(works('shelter', { wind, from, plant, wall, prop: leeOf(from) })).toBe(true);
        }
      }
    }
  });

  it('needs the prop to be thought about: with a prop stood anywhere, some walls fall and some stand', () => {
    // The same prop on the same side holds in one wind and not in the other: it is where the wind is that counts.
    expect(
      outcome('shelter', {
        wind: 'gust',
        from: 'left',
        plant: 'seedling',
        wall: 'low',
        prop: 'right',
      }),
    ).toBe('sheltered');
    expect(
      outcome('shelter', {
        wind: 'gust',
        from: 'right',
        plant: 'seedling',
        wall: 'low',
        prop: 'right',
      }),
    ).toBe('blew-over');
  });
});

describe('things dropped in water', () => {
  it('float or sink by what they are made of', () => {
    for (const [thing, { floats, made }] of Object.entries(DROPPED)) {
      expect(outcome('tub', { thing }), thing).toBe(floats ? 'floated' : 'sank');
      // Wood, cork and air float; stone, metal and baked clay sink. Nothing here is in two minds.
      expect(['wood', 'cork', 'air inside'].includes(made), thing).toBe(floats);
    }
  });

  it('do not go by size: something big floats and something small sinks, and the other way about', () => {
    const sized = (size: string, floats: boolean) =>
      things.filter((thing) => DROPPED[thing]?.size === size && DROPPED[thing].floats === floats);
    expect(sized('big', true)).toContain('log');
    expect(sized('small', false)).toContain('pebble');
    expect(sized('big', false)).toContain('brick');
    expect(sized('small', true)).toContain('cork');
  });

  it('include the same shape made of two things: a wooden spoon floats and a metal one sinks', () => {
    expect(outcome('tub', { thing: 'wooden-spoon' })).toBe('floated');
    expect(outcome('tub', { thing: 'metal-spoon' })).toBe('sank');
  });

  it('are as many floaters as sinkers, so that guessing one way is no use', () => {
    const floaters = things.filter((thing) => DROPPED[thing]?.floats);
    expect(floaters).toHaveLength(things.length / 2);
  });
});

describe('every model', () => {
  const everything = fc.oneof(
    bridges.map((setup): [string, Setup] => ['bridge', setup]),
    ramps.map((setup): [string, Setup] => ['ramp', setup]),
    beams.map((setup): [string, Setup] => ['balance', setup]),
    ponds.map((setup): [string, Setup] => ['boat', setup]),
    shelters.map((setup): [string, Setup] => ['shelter', setup]),
    fc.constantFrom(...things).map((thing): [string, Setup] => ['tub', { thing }]),
  );

  it('does the same thing every time, and only things it is said to do', () => {
    fc.assert(
      fc.property(everything, ([scene, setup]) => {
        const first = testSetup(scene, setup);
        expect(first).not.toBeNull();
        expect(testSetup(scene, { ...setup })).toEqual(first);
        expect(OUTCOMES[scene]).toContain(first?.outcome);
      }),
    );
  });

  it('can do each of the things it is said to do', () => {
    for (const [scene, outcomes] of Object.entries(OUTCOMES)) {
      const seen = new Set(
        fc
          .sample(
            everything.filter(([name]) => name === scene),
            400,
          )
          .map(([, setup]) => outcome(scene, setup)),
      );
      expect([...seen].sort(), scene).toEqual([...outcomes].sort());
    }
  });

  it('has a workbench for everything a child can change, and nothing to change in the tub', () => {
    expect(Object.keys(MODELS).sort()).toEqual(['balance', 'boat', 'bridge', 'ramp', 'shelter']);
    expect(CONTROLS.tub).toEqual({});
    for (const bench of Object.keys(MODELS)) {
      expect(Object.keys(CONTROLS[bench] ?? {}), bench).toHaveLength(2);
    }
  });
});

describe('a set-up that cannot be tested', () => {
  it('is refused, and told why', () => {
    expect(setupProblem('bridge', { gap: 3, traveller: 'goat', plank: 'thin', posts: 'one' })).toBe(
      null,
    );
    expect(setupProblem('bridge', { gap: 5, traveller: 'goat', plank: 'thin', posts: 'one' })).toBe(
      'gap is 5',
    );
    expect(setupProblem('bridge', { gap: 3, traveller: 'ox', plank: 'thin', posts: 'one' })).toBe(
      'traveller is "ox"',
    );
    expect(setupProblem('bridge', { gap: 3, traveller: 'goat', plank: 'thin' })).toBe(
      'posts is undefined',
    );
    expect(
      setupProblem('bridge', {
        gap: 3,
        traveller: 'goat',
        plank: 'thin',
        posts: 'one',
        paint: 'red',
      }),
    ).toBe('paint is not a part of a bridge');
    expect(setupProblem('ramp', { target: 7, height: 'low', surface: 'rough' })).toBe(
      'target is 7',
    );
    expect(setupProblem('ramp', { target: 2.5, height: 'low', surface: 'rough' })).toBe(
      'target is 2.5',
    );
    expect(setupProblem('tub', { thing: 'anvil' })).toBe('thing is "anvil"');
    expect(setupProblem('catapult', {})).toBe('"catapult" is not something that can be tested');
  });

  it('is refused at the shelter too: a wind nobody named, from nowhere, on nothing, held by a prop that is not one', () => {
    const good = { wind: 'gust', from: 'left', plant: 'seedling', wall: 'low', prop: 'right' };
    expect(setupProblem('shelter', good)).toBe(null);
    expect(setupProblem('shelter', { ...good, wind: 'gale' })).toBe('wind is "gale"');
    expect(setupProblem('shelter', { ...good, from: 'above' })).toBe('from is "above"');
    expect(setupProblem('shelter', { ...good, plant: 'oak' })).toBe('plant is "oak"');
    expect(setupProblem('shelter', { ...good, wall: 'huge' })).toBe('wall is "huge"');
    expect(setupProblem('shelter', { ...good, prop: 'behind' })).toBe('prop is "behind"');
    expect(setupProblem('shelter', { ...good, roof: 'tiled' })).toBe(
      'roof is not a part of a shelter',
    );
  });

  it('is never tested: there is no answer to draw', () => {
    expect(
      testSetup('bridge', { gap: 3, traveller: 'ox', plank: 'thin', posts: 'one' }),
    ).toBeNull();
    expect(testSetup('catapult', {})).toBeNull();
  });
});

describe('a design task', () => {
  const task: DesignTask = {
    type: 'design',
    model: 'bridge',
    given: { gap: 3, traveller: 'goat' },
    controls: [
      { id: 'plank', options: ['thin', 'thick'] },
      { id: 'posts', options: ['none', 'one', 'two'] },
    ],
    solution: ['thick', 'one'],
  };

  it('starts from the first value of each part, unless the task gives it another to start from', () => {
    expect(startingDesign(task)).toEqual(['thin', 'none']);
    expect(startingDesign({ ...task, given: { ...task.given, posts: 'two' } })).toEqual([
      'thin',
      'two',
    ]);
    // A starting value the part cannot take is not a starting value.
    expect(startingDesign({ ...task, given: { ...task.given, plank: 'steel' } })).toEqual([
      'thin',
      'none',
    ]);
  });

  it('is tested with what was chosen in place of what it started with', () => {
    const started = { ...task, given: { ...task.given, plank: 'thin', posts: 'none' } };
    expect(testDesign(started, ['thin', 'none'])).toEqual({ works: false, outcome: 'sagged' });
    expect(testDesign(started, ['thick', 'one'])).toEqual({ works: true, outcome: 'held' });
    expect(testDesign(started, ['thin', 'two'])).toEqual({ works: true, outcome: 'held' });
  });

  it('reads a part that cannot be changed from what is given', () => {
    const fixedGround: DesignTask = {
      type: 'design',
      model: 'ramp',
      given: { target: 2, surface: 'rough' },
      controls: [{ id: 'height', options: ['low', 'mid', 'high'] }],
      solution: ['mid'],
    };
    expect(testDesign(fixedGround, ['mid'])).toEqual({ works: true, outcome: 'landed' });
    expect(testDesign(fixedGround, ['low'])?.outcome).toBe('rolled-short');
  });
});
