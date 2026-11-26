import { describe, expect, it } from 'vitest';
import inventorIsland from '@/content/packs/inventor-island.v2.json';
import {
  BOATS,
  CONTROLS,
  COUNTS,
  DROPPED,
  GAPS,
  OUTCOMES,
  PROPS,
  SHELTERED,
  SIDES,
  TRAVELLERS,
  WALLS,
  WINDS,
  leeOf,
  parseContentPack,
  rampReach,
  testSetup,
  type Stage,
  type Stimulus,
} from '@/engine';
import type { Beat, Script, ScriptEvent } from '@/game/lesson/script';
import {
  BALL,
  BEAM_STEP,
  BEND,
  DECK,
  FAR_BANK,
  GROUND,
  HEIGHT,
  HELD,
  HULLS,
  MEADOW,
  NEAR_BANK,
  PIVOT,
  PLANT_HEIGHTS,
  POLE_HEIGHT,
  POND,
  POND_FLOOR,
  PROP_FOOT,
  STREAM,
  SURFACE,
  TEST_TIME,
  THING_SHAPES,
  TIP,
  TRAVELLER_WIDTH,
  TUB_FLOOR,
  WALL_AT,
  WALL_HEIGHTS,
  WALL_THICK,
  WIDTH,
  balanceShape,
  ballRest,
  boatShape,
  bow,
  bridgeShape,
  dropOf,
  fallOf,
  lengthMiddle,
  rampShape,
  shelterShape,
  tipOf,
} from '@/game/worlds/inventor-island/geometry';
import { guessScript, mendScript } from '@/game/worlds/inventor-island/script';
import {
  CONTROL_NAMES,
  OPTION_NAMES,
  OUTCOME_WORDS,
  describe as describePicture,
  describeSetup,
} from '@/game/worlds/inventor-island/words';

const beats = (script: Script): Beat[] =>
  script.moments.flatMap((moment) => (moment.beat ? [moment.beat] : []));
const said = (script: Script): string[] =>
  script.moments.flatMap((moment) => (moment.sound?.kind === 'say' ? [moment.sound.key] : []));
const cues = (script: Script): string[] =>
  script.moments.flatMap((moment) => (moment.sound?.kind === 'cue' ? [moment.sound.cue] : []));
/** When the first test in a script starts, and when the first moment after it comes. */
function testTimes(script: Script): { starts: number; ends: number } | null {
  const start = script.moments.find((moment) => moment.beat?.show === 'count');
  if (!start) return null;
  const after = script.moments.find((moment) => moment.at > start.at && moment.beat !== undefined);
  return { starts: start.at, ends: after?.at ?? script.length };
}
const TEST: Beat = { show: 'count', group: 'prompt' };

// ---------------------------------------------------------------------------------------------------------------------
// What a guess shows
// ---------------------------------------------------------------------------------------------------------------------

describe('a guess, moment by moment', () => {
  const guess = (
    stage: Stage,
    event: ScriptEvent,
    extra: { seen?: boolean; again?: boolean; seconds?: number } = {},
  ) =>
    guessScript({
      stage,
      event,
      again: extra.again ?? false,
      seen: extra.seen ?? false,
      answer: stage === 'demo' ? 'b' : null,
      lines: {
        instruction: 'q.ask',
        feedback: event === 'correct' || event === 'incorrect' ? 'q.feedback' : null,
        hint: event.startsWith('hint') ? 'q.hint' : null,
        outcome: 'q.happened',
      },
      seconds: () => extra.seconds ?? 0,
    });

  it('in a demonstration asks, guesses, tests, and lights the guess with what happened', () => {
    const script = guess('demo', 'new');
    expect(beats(script)).toEqual([
      { show: 'ask' },
      { show: 'name', which: 'b' },
      TEST,
      { show: 'rest' },
      { show: 'same' },
    ]);
    expect(said(script)).toEqual(['lesson.watch', 'q.ask', 'q.happened']);
    expect(script.settled).toEqual({ show: 'same' });
  });

  it('on a new step asks and offers the pictures, and tests nothing: the guess comes first', () => {
    for (const stage of ['guided', 'independent'] as const) {
      const script = guess(stage, 'new');
      expect(beats(script)).toEqual([{ show: 'ask' }, { show: 'rest' }]);
      expect(said(script)).toEqual(['q.ask']);
    }
  });

  it('says the question again for the asking, and no more', () => {
    const script = guess('independent', 'new', { again: true });
    expect(said(script)).toEqual(['q.ask']);
    expect(beats(script)).toEqual([{ show: 'rest' }]);
  });

  it('tests the set-up as soon as a guess is made, right or not: finding out is the answer', () => {
    expect(beats(guess('independent', 'correct'))).toEqual([
      TEST,
      { show: 'rest' },
      { show: 'same' },
    ]);
    expect(beats(guess('independent', 'incorrect'))).toEqual([
      TEST,
      { show: 'rest' },
      { show: 'rest' },
    ]);
  });

  it('lets a test run its whole length before anything is said about it', () => {
    for (const event of ['correct', 'incorrect'] as const) {
      const script = guess('independent', event, { seconds: 1.5 });
      const test = testTimes(script);
      const spoken = script.moments.find((moment) => moment.sound?.kind === 'say');
      expect(test).not.toBeNull();
      expect((test?.ends ?? 0) - (test?.starts ?? 0)).toBe(TEST_TIME);
      expect(spoken?.at ?? 0, event).toBeGreaterThanOrEqual(test?.ends ?? Infinity);
    }
  });

  it('does not play a test again that has been watched, when the child taps what happened', () => {
    const script = guess('independent', 'correct', { seen: true });
    expect(beats(script)).toEqual([{ show: 'same' }]);
    expect(said(script)).toEqual(['q.feedback']);
  });

  it('only rings "these go together" for a guess that came true', () => {
    expect(cues(guess('independent', 'correct'))).toContain('same');
    expect(cues(guess('independent', 'incorrect'))).not.toContain('same');
  });

  it('helps by pointing at the thing, then by taking a picture away, then by testing it', () => {
    expect(beats(guess('guided', 'hint-model'))).toEqual([
      { show: 'name', which: 'prompt' },
      { show: 'rest' },
    ]);
    expect(beats(guess('guided', 'hint-eliminate'))).toEqual([{ show: 'rest' }]);
    expect(beats(guess('guided', 'hint-reveal'))).toEqual([
      TEST,
      { show: 'rest' },
      { show: 'rest' },
    ]);
    for (const event of ['hint-model', 'hint-eliminate', 'hint-reveal'] as const) {
      expect(said(guess('guided', event))).toEqual(['q.hint']);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// What a mend shows
// ---------------------------------------------------------------------------------------------------------------------

describe('a mend, moment by moment', () => {
  const mend = (
    stage: Stage,
    event: ScriptEvent,
    extra: { untouched?: boolean; changes?: number[]; parts?: number; seconds?: number } = {},
  ) =>
    mendScript({
      stage,
      event,
      again: false,
      untouched: extra.untouched ?? true,
      parts: extra.parts ?? 2,
      changes: extra.changes ?? [],
      lines: {
        instruction: 'm.ask',
        feedback: event === 'correct' || event === 'incorrect' ? 'm.feedback' : null,
        hint: event.startsWith('hint') ? 'm.hint' : null,
      },
      seconds: () => extra.seconds ?? 0,
    });
  const tested = (script: Script) =>
    beats(script).flatMap((beat) => (beat.show === 'count' ? [beat.group] : []));

  it('in a demonstration shows the trouble, changes one part at a time, and tests what it made', () => {
    const script = mend('demo', 'new', { changes: [1, 2] });
    expect(beats(script)).toEqual([
      { show: 'count', group: 'start' },
      { show: 'rest' },
      { show: 'do', parts: 0 },
      { show: 'do', parts: 1 },
      { show: 'do', parts: 2 },
      { show: 'do', parts: 2 },
      TEST,
      { show: 'rest' },
      { show: 'same' },
    ]);
    expect(said(script)).toEqual(['lesson.watch', 'm.ask']);
  });

  it('in a demonstration leaves alone a part that is right already', () => {
    const script = mend('demo', 'new', { changes: [2] });
    const done = beats(script).flatMap((beat) => (beat.show === 'do' ? [beat.parts] : []));
    expect(done).toEqual([0, 2, 2]);
  });

  it('shows the trouble once on a new step, for nothing, while the design is as it was handed over', () => {
    expect(tested(mend('guided', 'new'))).toEqual(['start']);
    expect(tested(mend('independent', 'new'))).toEqual(['start']);
    // Once the child has changed something, what they see is their own design, and it has not been tested.
    expect(tested(mend('independent', 'new', { untouched: false }))).toEqual([]);
  });

  it('tests the design that was handed in, and says what there is to say when the test is over', () => {
    const works = mend('independent', 'correct', { seconds: 1.5 });
    expect(tested(works)).toEqual(['prompt']);
    expect(works.settled).toEqual({ show: 'same' });
    const fails = mend('independent', 'incorrect', { seconds: 1.5 });
    expect(tested(fails)).toEqual(['tried']);
    expect(fails.settled).toEqual({ show: 'rest' });
    for (const script of [works, fails]) {
      const spoken = script.moments.find((moment) => moment.sound?.kind === 'say');
      expect(spoken?.at ?? 0).toBeGreaterThanOrEqual(testTimes(script)?.ends ?? Infinity);
    }
    expect(cues(works)).toContain('same');
    expect(cues(fails)).not.toContain('same');
  });

  it('tests nothing when help is asked for: help is told, and the next test is still the child’s', () => {
    for (const event of ['hint-model', 'hint-step', 'hint-reveal'] as const) {
      const script = mend('guided', event);
      expect(tested(script)).toEqual([]);
      expect(said(script)).toEqual(['m.hint']);
    }
  });
});

describe('every script', () => {
  const lines = { instruction: 'a', feedback: 'b', hint: 'c', outcome: 'd' };
  const scripts: [string, Script][] = [];
  for (const stage of ['demo', 'guided', 'independent'] as const) {
    for (const event of [
      'new',
      'correct',
      'incorrect',
      'hint-model',
      'hint-eliminate',
      'hint-step',
      'hint-reveal',
    ] as const) {
      for (const seconds of [0, 2.4]) {
        scripts.push([
          `guess ${stage} ${event} ${String(seconds)}`,
          guessScript({
            stage,
            event,
            again: false,
            seen: false,
            answer: 'a',
            lines,
            seconds: () => seconds,
          }),
        ]);
        scripts.push([
          `mend ${stage} ${event} ${String(seconds)}`,
          mendScript({
            stage,
            event,
            again: false,
            untouched: true,
            parts: 2,
            changes: [1, 2],
            lines,
            seconds: () => seconds,
          }),
        ]);
      }
    }
  }

  it('runs forwards in time and ends on its settled beat', () => {
    for (const [name, script] of scripts) {
      const times = script.moments.map((moment) => moment.at);
      expect(times, name).toEqual([...times].sort((a, b) => a - b));
      // The last thing shown is what it comes to rest on, and nothing happens after it is over. (A line said
      // at the very end, when nobody will hear it, takes no time and so falls on the same moment.)
      expect(beats(script).at(-1), name).toEqual(script.settled);
      expect(Math.max(...times), name).toBe(script.length);
    }
  });

  it('is short enough to sit through: under twenty seconds even with every line spoken', () => {
    for (const [name, script] of scripts) expect(script.length, name).toBeLessThan(20_000);
    // A step that is not a demonstration is over much sooner than that.
    for (const [name, script] of scripts) {
      if (!name.includes(' demo ')) expect(script.length, name).toBeLessThan(8000);
    }
  });

  it('never tests two things at once', () => {
    for (const [name, script] of scripts) {
      const tests = script.moments.filter((moment) => moment.beat?.show === 'count');
      tests.forEach((test, index) => {
        const next = tests[index + 1];
        if (next) expect(next.at - test.at, name).toBeGreaterThanOrEqual(TEST_TIME);
      });
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Where things are drawn
// ---------------------------------------------------------------------------------------------------------------------

describe('the picture of a bridge', () => {
  const setups = GAPS.flatMap((gap) =>
    Object.keys(TRAVELLERS).flatMap((traveller) =>
      ['thin', 'thick'].flatMap((plank) =>
        ['none', 'one', 'two'].map((posts) => ({ gap, traveller, plank, posts })),
      ),
    ),
  );

  it('keeps the banks, the plank and the traveller inside the picture, before and after', () => {
    for (const setup of setups) {
      const shape = bridgeShape(setup);
      const half = (TRAVELLER_WIDTH[setup.traveller] ?? 0) / 2;
      expect(shape.near, JSON.stringify(setup)).toBeGreaterThan(40);
      expect(shape.far).toBeLessThan(WIDTH - 40);
      expect(shape.from).toBeLessThan(shape.near);
      expect(shape.to).toBeGreaterThan(shape.far);
      // The traveller waits wholly on the near bank and ends wholly on the far one.
      expect(shape.wait - half).toBeGreaterThanOrEqual(0);
      expect(shape.wait + half).toBeLessThanOrEqual(shape.near);
      expect(shape.wait + shape.across - half).toBeGreaterThanOrEqual(shape.far);
      expect(shape.wait + shape.across + half).toBeLessThanOrEqual(WIDTH);
    }
  });

  it('stands the posts under the plank, evenly, and rests the plank on every one', () => {
    for (const setup of setups) {
      const shape = bridgeShape(setup);
      const count = { none: 0, one: 1, two: 2 }[setup.posts];
      expect(shape.posts).toHaveLength(count ?? -1);
      expect(shape.rests).toEqual([shape.near, ...shape.posts, shape.far]);
      const stretches = shape.rests.slice(1).map((rest, index) => rest - (shape.rests[index] ?? 0));
      for (const stretch of stretches) expect(stretch).toBeCloseTo(stretches[0] ?? 0, 6);
      expect(shape.half).toBeCloseTo((stretches[0] ?? 0) / 2, 6);
    }
  });

  it('draws a wider gap wider and a thicker plank thicker', () => {
    const wide = (gap: number) => {
      const shape = bridgeShape({ gap, traveller: 'goat', plank: 'thin', posts: 'none' });
      return shape.far - shape.near;
    };
    expect(wide(2)).toBeLessThan(wide(3));
    expect(wide(3)).toBeLessThan(wide(4));
    const thick = (plank: string) =>
      bridgeShape({ gap: 3, traveller: 'goat', plank, posts: 'none' }).thick;
    expect(thick('thick')).toBe(2 * thick('thin'));
  });

  it('bows the first stretch into the water and no further, with its two halves still meeting', () => {
    for (const setup of setups) {
      const shape = bridgeShape(setup);
      // A bridge that sags can be seen to sag: a short stretch cannot dip far, but no short stretch ever sags
      // by so little that it would not show.
      if (testSetup('bridge', setup)?.outcome === 'sagged') {
        expect(shape.dip, JSON.stringify(setup)).toBeGreaterThanOrEqual(7);
      }
      expect(DECK + shape.dip).toBeLessThanOrEqual(STREAM);
      const { degrees, stretch } = bow(shape.half, shape.dip);
      const angle = (degrees * Math.PI) / 180;
      // The end of each half comes down by exactly the dip, and stays above the middle of the stretch.
      expect(shape.half * stretch * Math.sin(angle)).toBeCloseTo(shape.dip, 6);
      expect(shape.half * stretch * Math.cos(angle)).toBeCloseTo(shape.half, 6);
      expect(degrees).toBeLessThan(35);
      // The traveller stops in the middle of that stretch.
      expect(shape.wait + shape.middle).toBeCloseTo(shape.near + shape.half, 6);
    }
  });
});

describe('the picture of a ramp', () => {
  const setups = [1, 2, 3, 4, 5, 6].flatMap((target) =>
    ['low', 'mid', 'high'].flatMap((height) =>
      ['rough', 'smooth'].map((surface) => ({ target, height, surface })),
    ),
  );

  it('stops the ball in the middle of the length the model says it reaches', () => {
    for (const setup of setups) {
      const shape = rampShape(setup);
      const rest = shape.top[0] + shape.toRest;
      expect(rest, JSON.stringify(setup)).toBe(
        lengthMiddle(rampReach(setup.height, setup.surface)),
      );
      expect(rest + BALL).toBeLessThanOrEqual(WIDTH);
      // It comes down to the ground and stays on it.
      expect(shape.top[1] + shape.toFoot[1] + BALL).toBe(GROUND);
      expect(shape.star).toBe(lengthMiddle(setup.target));
    }
  });

  it('puts the ball on the star exactly when the model says it lands', () => {
    for (const setup of setups) {
      const shape = rampShape(setup);
      const onStar = shape.top[0] + shape.toRest === shape.star;
      expect(onStar, JSON.stringify(setup)).toBe(testSetup('ramp', setup)?.outcome === 'landed');
    }
  });

  it('draws a higher ramp higher, and lets the ball go from the top of it', () => {
    const rise = (height: string) => rampShape({ target: 3, height, surface: 'smooth' }).rise;
    expect(rise('low')).toBeLessThan(rise('mid'));
    expect(rise('mid')).toBeLessThan(rise('high'));
    for (const setup of setups) {
      const shape = rampShape(setup);
      expect(shape.top[1]).toBe(GROUND - shape.rise - BALL);
      expect(shape.top[1] - BALL).toBeGreaterThan(0);
    }
  });

  it('shows a way it might have turned out on the right side of the star', () => {
    for (const setup of setups) {
      const star = lengthMiddle(setup.target);
      expect(ballRest(setup, 'landed'), JSON.stringify(setup)).toBe(star);
      expect(ballRest(setup, 'rolled-short')).toBeLessThan(star);
      expect(ballRest(setup, 'rolled-past')).toBeGreaterThan(star);
      expect(ballRest(setup, 'rolled-past') + BALL).toBeLessThanOrEqual(WIDTH);
      // What really happens is drawn where it really stops.
      const happens = testSetup('ramp', setup)?.outcome ?? null;
      expect(ballRest(setup, happens)).toBe(ballRest(setup, null));
    }
  });
});

describe('the picture of a balance', () => {
  it('stands each stack as many steps out as the set-up says, the same step on both sides', () => {
    const shape = balanceShape({ leftWeight: 2, leftAt: 3, weight: 'three', at: 'near' });
    expect(shape.left).toEqual({ blocks: 2, at: -3 * BEAM_STEP });
    expect(shape.right).toEqual({ blocks: 3, at: BEAM_STEP });
  });

  it('turns the beam the way the model says: left side down is anticlockwise', () => {
    expect(tipOf('tipped-left')).toBe(-TIP);
    expect(tipOf('tipped-right')).toBe(TIP);
    expect(tipOf('balanced')).toBe(0);
  });

  it('keeps the low end of a tipped beam, and the stacks on it, above the ground and in the picture', () => {
    const reach = 3 * BEAM_STEP + 8;
    const drop = reach * Math.sin((TIP * Math.PI) / 180);
    expect(PIVOT[1] + drop).toBeLessThan(104);
    // Three blocks on the high end, far out, are still in the picture.
    const top = PIVOT[1] - drop - 6 - 3 * 12;
    expect(top).toBeGreaterThan(0);
    expect(PIVOT[0] + reach).toBeLessThan(WIDTH);
    expect(PIVOT[0] - reach).toBeGreaterThan(0);
  });
});

describe('the picture of a thing dropped in the tub', () => {
  it('knows the shape of everything that can be dropped', () => {
    expect(Object.keys(THING_SHAPES).sort()).toEqual(Object.keys(DROPPED).sort());
  });

  it('leaves a floating thing at the surface with some of it showing, and a sunk one on the floor', () => {
    for (const [thing, shape] of Object.entries(THING_SHAPES)) {
      const floats = dropOf(thing, 'floated');
      const middle = HELD[1] + floats.toRest;
      expect(middle - shape.half, thing).toBeLessThan(SURFACE);
      expect(middle + shape.half, thing).toBeGreaterThan(SURFACE);
      const sinks = dropOf(thing, 'sank');
      expect(HELD[1] + sinks.toRest + shape.half, thing).toBeLessThanOrEqual(TUB_FLOOR);
      expect(HELD[1] + sinks.toRest - shape.half, thing).toBeGreaterThan(SURFACE);
      // On the way down it passes the surface first.
      expect(sinks.toSurface).toBeLessThan(sinks.toRest);
      // Held, it is wholly out of the water and wholly in the picture.
      expect(HELD[1] + shape.half).toBeLessThan(SURFACE);
      expect(HELD[1] - shape.half).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('the picture of a boat', () => {
  const setups = Object.keys(BOATS).flatMap((boat) =>
    Object.keys(COUNTS).flatMap((cargo) => [1, 2, 3].map((need) => ({ need, boat, cargo }))),
  );

  it('knows the shape of every boat', () => {
    expect(Object.keys(HULLS).sort()).toEqual(Object.keys(BOATS).sort());
    const wide = Object.keys(BOATS)
      .sort((a, b) => (BOATS[a] ?? 0) - (BOATS[b] ?? 0))
      .map((boat) => HULLS[boat]?.wide ?? 0);
    // A boat that carries more is drawn bigger.
    expect(wide).toEqual([...wide].sort((a, b) => a - b));
  });

  it('sits lower the more is aboard, and always shows some of its side', () => {
    for (const boat of Object.keys(BOATS)) {
      const lows = Object.keys(COUNTS).map((cargo) => boatShape({ need: 3, boat, cargo }).low);
      expect(lows, boat).toEqual([...lows].sort((a, b) => a - b));
      for (const low of lows) expect(low, boat).toBeLessThan(HULLS[boat]?.deep ?? 0);
    }
  });

  it('keeps the boat on the water, between the banks, from setting off to arriving', () => {
    for (const setup of setups) {
      const shape = boatShape(setup);
      const half = shape.hull.wide / 2;
      expect(shape.at - half, JSON.stringify(setup)).toBeGreaterThanOrEqual(NEAR_BANK);
      expect(shape.at + shape.sail + half).toBeLessThanOrEqual(FAR_BANK);
      expect(shape.sail).toBeGreaterThan(40);
      // Sunk, its floor is on the floor of the pond, inside the picture.
      expect(POND + shape.low + shape.down).toBe(POND_FLOOR);
      expect(POND_FLOOR).toBeLessThanOrEqual(HEIGHT);
    }
  });

  it('leaves on the bank whatever is not aboard', () => {
    expect(boatShape({ need: 3, boat: 'raft', cargo: 'two' })).toMatchObject({
      aboard: 2,
      waiting: 1,
    });
    expect(boatShape({ need: 2, boat: 'bark', cargo: 'two' })).toMatchObject({
      aboard: 2,
      waiting: 0,
    });
  });
});

describe('the picture of a shelter', () => {
  const setups = Object.keys(WINDS).flatMap((wind) =>
    SIDES.flatMap((from) =>
      Object.keys(SHELTERED).flatMap((plant) =>
        Object.keys(WALLS).flatMap((wall) =>
          PROPS.map((prop) => ({ wind, from, plant, wall, prop })),
        ),
      ),
    ),
  );

  it('draws a taller wall taller, and each plant against it as the model has them', () => {
    expect(Object.keys(WALL_HEIGHTS).sort()).toEqual(Object.keys(WALLS).sort());
    expect(Object.keys(PLANT_HEIGHTS).sort()).toEqual(Object.keys(SHELTERED).sort());
    // What the model says in numbers can be seen: a wall that is tall enough for a plant is drawn taller than it.
    for (const [wall, tall] of Object.entries(WALLS)) {
      for (const [plant, high] of Object.entries(SHELTERED)) {
        const drawnTaller = (WALL_HEIGHTS[wall] ?? 0) >= (PLANT_HEIGHTS[plant] ?? 0);
        expect(drawnTaller, `${wall} wall, ${plant}`).toBe(tall >= high);
      }
    }
  });

  it('stands the plant on the side away from the wind, where a wall that falls cannot land on it', () => {
    for (const setup of setups) {
      const shape = shelterShape(setup);
      const lee = leeOf(setup.from) === 'right' ? 1 : -1;
      expect(shape.blows, JSON.stringify(setup)).toBe(lee);
      expect(Math.sign(shape.plant - WALL_AT)).toBe(lee);
      // The wall, lying where it fell, ends short of the plant's stem.
      const reach = shape.wall + WALL_THICK / 2;
      expect(Math.abs(shape.plant - WALL_AT)).toBeGreaterThan(reach + 4);
      // And it falls a quarter turn, away from the wind.
      expect(fallOf(shape).wall).toBe(90 * lee);
    }
  });

  it('keeps everything inside the picture: the pole, the wall, the plant upright and bent over', () => {
    for (const setup of setups) {
      const shape = shelterShape(setup);
      expect(shape.pole, JSON.stringify(setup)).toBeGreaterThanOrEqual(6);
      expect(shape.pole).toBeLessThanOrEqual(WIDTH - 6);
      expect(MEADOW - POLE_HEIGHT).toBeGreaterThanOrEqual(8);
      expect(MEADOW - shape.wall).toBeGreaterThanOrEqual(8);
      expect(MEADOW).toBeLessThan(HEIGHT);
      // The pole is on the side the wind comes from, further out than anything else.
      expect(Math.sign(shape.pole - WALL_AT)).toBe(-shape.blows);
      // A plant bent over by the wind leans away from it; its top, and a flower head on it, stay in the picture.
      const top = shape.plant + shape.blows * shape.plantHeight * Math.sin((BEND * Math.PI) / 180);
      expect(top - 10).toBeGreaterThanOrEqual(0);
      expect(top + 10).toBeLessThanOrEqual(WIDTH);
    }
  });

  it('leans a prop against the side it is on: its foot on that side, its top on the wall', () => {
    for (const setup of setups) {
      const { prop, wall } = shelterShape(setup);
      if (setup.prop === 'none') {
        expect(prop).toBeNull();
        continue;
      }
      expect(prop, JSON.stringify(setup)).not.toBeNull();
      if (!prop) continue;
      expect(prop.side).toBe(setup.prop === 'left' ? -1 : 1);
      expect(prop.foot).toBe(WALL_AT + prop.side * PROP_FOOT);
      // Its top is on the wall, above half way up and below the top.
      expect(prop.rise).toBeGreaterThan(wall / 2);
      expect(prop.rise).toBeLessThan(wall);
      // Between the wall and the plant there is room for it.
      expect(PROP_FOOT).toBeLessThan(Math.abs(shelterShape(setup).plant - WALL_AT) - 20);
    }
  });

  it('brings a prop that held nothing down flat, towards the wall it was leant on', () => {
    for (const setup of setups) {
      const shape = shelterShape(setup);
      const { prop } = shape;
      const turn = fallOf(shape).prop;
      if (!prop) {
        expect(turn).toBe(0);
        continue;
      }
      // Turned by that much about its foot, its top is on the ground, on the wall's side of the foot.
      const dx = -prop.side * (PROP_FOOT - WALL_THICK / 2);
      const dy = -prop.rise;
      const radians = (turn * Math.PI) / 180;
      const x = dx * Math.cos(radians) - dy * Math.sin(radians);
      const y = dx * Math.sin(radians) + dy * Math.cos(radians);
      // (The prop is drawn to the wall's face, a little steeper than the line the turn is worked out from.)
      expect(Math.abs(y), JSON.stringify(setup)).toBeLessThan(6);
      expect(Math.sign(x)).toBe(-prop.side);
    }
  });

  it('shows more wind in a gust: more streaks, and the pennant lifted further', () => {
    const breeze = shelterShape({
      wind: 'breeze',
      from: 'left',
      plant: 'seedling',
      wall: 'low',
      prop: 'none',
    });
    const gust = shelterShape({
      wind: 'gust',
      from: 'left',
      plant: 'seedling',
      wall: 'low',
      prop: 'none',
    });
    expect(gust.streaks).toBeGreaterThan(breeze.streaks);
    expect(gust.lift).toBeGreaterThan(breeze.lift);
    expect(gust.lift).toBeLessThanOrEqual(90);
  });

  it('is the same picture turned round when the wind comes from the other side', () => {
    for (const setup of setups.filter((each) => each.from === 'left')) {
      const turnedProp = setup.prop === 'none' ? 'none' : leeOf(setup.prop);
      const one = shelterShape(setup);
      const other = shelterShape({ ...setup, from: 'right', prop: turnedProp });
      expect(other.plant - WALL_AT, JSON.stringify(setup)).toBe(-(one.plant - WALL_AT));
      expect(other.pole - WALL_AT).toBe(-(one.pole - WALL_AT));
      expect(other.prop?.side ?? 0).toBe(-(one.prop?.side ?? 0) || 0);
      expect(fallOf(other).wall).toBe(-fallOf(one).wall);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The words
// ---------------------------------------------------------------------------------------------------------------------

describe('Inventor Island in words', () => {
  const parsed = parseContentPack(structuredClone(inventorIsland));
  if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
  const pack = parsed.value;

  const scene = (name: string, of: Record<string, string | number>): Stimulus => ({
    type: 'scene',
    scene: name,
    of,
  });

  it('says what a set-up is, part by part', () => {
    expect(
      describeSetup('bridge', { gap: 3, traveller: 'goat', plank: 'thin', posts: 'one' }),
    ).toBe(
      'A bridge over a gap three lengths wide: a thin plank with one post. A goat is waiting to cross.',
    );
    expect(describeSetup('ramp', { target: 4, height: 'high', surface: 'rough' })).toBe(
      'A high ramp onto rough ground, with a ball at the top. The star is four lengths along.',
    );
    expect(describeSetup('balance', { leftWeight: 2, leftAt: 3, weight: 'one', at: 'near' })).toBe(
      'A beam on its middle. On the blue side, two blocks three steps out. On the orange side, one block close in.',
    );
    expect(describeSetup('boat', { need: 2, boat: 'bark', cargo: 'two' })).toBe(
      'Two stones to take across a pond. The bark boat, with two stones aboard.',
    );
    expect(describeSetup('tub', { thing: 'wooden-spoon' })).toBe(
      'A tub of water, and a wooden spoon held over it.',
    );
    expect(
      describeSetup('shelter', {
        wind: 'gust',
        from: 'left',
        plant: 'sunflower',
        wall: 'tall',
        prop: 'right',
      }),
    ).toBe(
      'A strong gust blowing from the left, towards a tall sunflower. Between them, a tall wall with a prop on its right.',
    );
    expect(
      describeSetup('shelter', {
        wind: 'breeze',
        from: 'right',
        plant: 'seedling',
        wall: 'low',
        prop: 'none',
      }),
    ).toBe(
      'A breeze blowing from the right, towards a little seedling. Between them, a low wall with no prop.',
    );
  });

  it('says of a picture of how it turned out only how it turned out, where that is the choice', () => {
    const held = scene('bridge', {
      gap: 2,
      traveller: 'goat',
      plank: 'thin',
      posts: 'none',
      shown: 'held',
    });
    expect(describePicture(held, 'choice')).toBe('It holds');
    expect(describePicture(held)).toContain('Afterwards: it holds.');
    expect(describePicture({ type: 'picture', id: 'sun' })).toBe('');
  });

  it('has a name for every part a child can change and every value it can take', () => {
    for (const parts of Object.values(CONTROLS)) {
      for (const [control, options] of Object.entries(parts)) {
        expect(CONTROL_NAMES[control], control).toBeTruthy();
        for (const option of options) expect(OPTION_NAMES[control]?.[option], option).toBeTruthy();
      }
    }
  });

  it('has words for every way a thing can turn out', () => {
    for (const [bench, outcomes] of Object.entries(OUTCOMES)) {
      for (const outcome of outcomes) expect(OUTCOME_WORDS[bench]?.[outcome], outcome).toBeTruthy();
    }
  });

  it('can describe every picture in the pack, and no two choices of a question the same way', () => {
    for (const lesson of pack.lessons) {
      for (const challenge of lesson.challenges) {
        if (challenge.kind === 'choose-one') {
          expect(describePicture(challenge.prompt.stimulus, 'prompt'), challenge.id).not.toBe('');
          const choices = challenge.choices.map((choice) =>
            describePicture(choice.stimulus, 'choice'),
          );
          expect(new Set(choices).size, challenge.id).toBe(choices.length);
          for (const words of choices) expect(words, challenge.id).not.toBe('');
        } else if (challenge.prompt.stimulus) {
          expect(describePicture(challenge.prompt.stimulus), challenge.id).not.toBe('');
        }
      }
    }
  });
});
