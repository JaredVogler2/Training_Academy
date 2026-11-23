import { describe, expect, it } from 'vitest';
import {
  ASK_TIME,
  HOP_EVERY,
  HOP_FIRST,
  HOP_LENGTH,
  countingTime,
  scriptFor,
  type Beat,
  type Script,
  type Situation,
} from '@/game/lesson/script';

const base: Situation = {
  stage: 'independent',
  event: 'new',
  amount: 2,
  triedAmount: null,
  revealed: false,
};

const beats = (script: Script): Beat[] =>
  script.moments.flatMap((moment) => (moment.beat ? [moment.beat] : []));

/** The notes sounded while one group is being counted, in order. */
function notesDuring(script: Script, group: 'prompt' | 'answer' | 'tried'): number[] {
  const start = script.moments.find(
    (moment) => moment.beat?.show === 'count' && moment.beat.group === group,
  );
  if (!start) return [];
  const next = script.moments.find((moment) => moment.at > start.at && moment.beat !== undefined);
  return script.moments
    .filter(
      (moment) =>
        moment.sound?.kind === 'count' &&
        moment.at >= start.at &&
        moment.at < (next?.at ?? Infinity),
    )
    .map((moment) => (moment.sound?.kind === 'count' ? moment.sound.index : -1));
}

describe('how long counting takes', () => {
  it('matches the animation: a first hop, one more for each thing, and the last one landing', () => {
    expect(countingTime(0)).toBe(0);
    expect(countingTime(1)).toBe(HOP_FIRST + HOP_LENGTH);
    expect(countingTime(3)).toBe(HOP_FIRST + 2 * HOP_EVERY + HOP_LENGTH);
  });
});

describe('the demonstration', () => {
  const script = scriptFor({ ...base, stage: 'demo', amount: 2 });

  it('counts the group, then its match, then lights them together', () => {
    expect(beats(script)).toEqual([
      { show: 'count', group: 'prompt' },
      { show: 'count', group: 'answer' },
      { show: 'same' },
    ]);
    expect(script.settled).toEqual({ show: 'same' });
  });

  it('sounds the same notes for both groups: that is what "the same amount" sounds like', () => {
    expect(notesDuring(script, 'prompt')).toEqual([0, 1]);
    expect(notesDuring(script, 'answer')).toEqual([0, 1]);
    expect(script.moments.at(-2)?.sound).toEqual({ kind: 'cue', cue: 'same' });
  });

  it('never lets one group start before the other has finished', () => {
    const [first, second] = script.moments.filter((moment) => moment.beat?.show === 'count');
    expect((second?.at ?? 0) - (first?.at ?? 0)).toBeGreaterThanOrEqual(countingTime(2));
  });

  it('is short enough for a four-year-old to sit through', () => {
    expect(scriptFor({ ...base, stage: 'demo', amount: 3 }).length).toBeLessThan(6000);
  });
});

describe('a new question', () => {
  it('on a guided step, is put and then counted with the child', () => {
    const script = scriptFor({ ...base, stage: 'guided', amount: 3 });
    expect(beats(script)).toEqual([
      { show: 'ask' },
      { show: 'count', group: 'prompt' },
      { show: 'rest' },
    ]);
    expect(notesDuring(script, 'prompt')).toEqual([0, 1, 2]);
  });

  it('on an independent step, is put and nothing more: no counting, no answer', () => {
    const script = scriptFor({ ...base, stage: 'independent' });
    expect(beats(script)).toEqual([{ show: 'ask' }, { show: 'rest' }]);
    expect(script.moments.some((moment) => moment.sound?.kind === 'count')).toBe(false);
    expect(script.moments[0]?.sound).toEqual({ kind: 'cue', cue: 'ask' });
    expect(script.length).toBeGreaterThanOrEqual(ASK_TIME);
  });

  it('never shows the answer of a step that is being asked', () => {
    for (const stage of ['guided', 'independent'] as const) {
      const shown = beats(scriptFor({ ...base, stage }));
      expect(shown).not.toContainEqual({ show: 'same' });
      expect(shown).not.toContainEqual({ show: 'count', group: 'answer' });
    }
  });
});

describe('after an answer', () => {
  it('a right one is counted on both sides and lit', () => {
    const script = scriptFor({ ...base, event: 'correct', amount: 3 });
    expect(beats(script)).toEqual([
      { show: 'count', group: 'prompt' },
      { show: 'count', group: 'answer' },
      { show: 'same' },
    ]);
    expect(notesDuring(script, 'answer')).toEqual(notesDuring(script, 'prompt'));
  });

  it('a wrong one is counted against the group it was matched to: a different number of notes', () => {
    const script = scriptFor({ ...base, event: 'incorrect', amount: 2, triedAmount: 3 });
    expect(beats(script)).toEqual([
      { show: 'count', group: 'prompt' },
      { show: 'count', group: 'tried' },
      { show: 'rest' },
    ]);
    expect(notesDuring(script, 'prompt')).toEqual([0, 1]);
    expect(notesDuring(script, 'tried')).toEqual([0, 1, 2]);
    // No "same" anywhere: nothing here was the same.
    expect(script.moments.some((moment) => moment.sound?.kind === 'cue')).toBe(false);
  });

  it('a wrong one that leaves only the answer goes on to count the answer', () => {
    const script = scriptFor({
      ...base,
      event: 'incorrect',
      amount: 1,
      triedAmount: 3,
      revealed: true,
    });
    expect(beats(script).at(-2)).toEqual({ show: 'count', group: 'answer' });
  });
});

describe('help', () => {
  it('"count them" counts the group; "this is the one" counts the answer; "not this one" asks again', () => {
    expect(beats(scriptFor({ ...base, event: 'hint-model' }))).toEqual([
      { show: 'count', group: 'prompt' },
      { show: 'rest' },
    ]);
    expect(beats(scriptFor({ ...base, event: 'hint-reveal', revealed: true }))).toEqual([
      { show: 'count', group: 'answer' },
      { show: 'rest' },
    ]);
    expect(beats(scriptFor({ ...base, event: 'hint-eliminate' }))).toEqual([
      { show: 'ask' },
      { show: 'rest' },
    ]);
  });
});

describe('every script', () => {
  const situations: Situation[] = [];
  for (const stage of ['demo', 'guided', 'independent'] as const) {
    for (const event of [
      'new',
      'correct',
      'incorrect',
      'hint-model',
      'hint-eliminate',
      'hint-reveal',
    ] as const) {
      for (const amount of [1, 2, 3]) {
        situations.push({
          stage,
          event,
          amount,
          triedAmount: event === 'incorrect' ? 2 : null,
          revealed: false,
        });
      }
    }
  }

  it('runs forwards in time, ends on its settled beat, and takes no more than eight seconds', () => {
    for (const situation of situations) {
      const script = scriptFor(situation);
      const times = script.moments.map((moment) => moment.at);
      expect(times, JSON.stringify(situation)).toEqual([...times].sort((a, b) => a - b));
      expect(script.moments.at(-1)?.beat).toEqual(script.settled);
      expect(script.moments.at(-1)?.at).toBe(script.length);
      expect(script.length).toBeLessThan(8000);
    }
  });
});
