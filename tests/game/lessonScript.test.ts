import { describe, expect, it } from 'vitest';
import type { Stage } from '@/engine';
import {
  ASK_TIME,
  type Beat,
  type ChooseSituation,
  type Script,
  type ScriptEvent,
} from '@/game/lesson/script';
import {
  GLANCE_TIME,
  HOP_EVERY,
  HOP_FIRST,
  HOP_LENGTH,
  chooseScript,
  countingTime,
  giveScript,
} from '@/game/worlds/number-garden/script';

/** A question about a group of `amount` things, as Number Garden's script is told of it. */
interface Situation {
  stage: Stage;
  event: ScriptEvent;
  amount: number;
  triedAmount: number | null;
  revealed: boolean;
  glance?: boolean;
  again?: boolean;
}

const base: Situation = {
  stage: 'independent',
  event: 'new',
  amount: 2,
  triedAmount: null,
  revealed: false,
};

const group = (count: number, item: 'leaf' | 'snail' = 'leaf') =>
  ({ type: 'quantity', item, count, arrangement: 'row' }) as const;

function situationOf(situation: Situation, seconds: (key: string) => number): ChooseSituation {
  const answer = { id: 'right', stimulus: group(situation.amount) };
  const tried =
    situation.triedAmount === null ? null : { id: 'tried', stimulus: group(situation.triedAmount) };
  return {
    stage: situation.stage,
    event: situation.event,
    prompt: group(situation.amount, 'snail'),
    glance: situation.glance ?? false,
    again: situation.again ?? false,
    choices: [answer, { id: 'other', stimulus: group(situation.amount + 1) }],
    answer,
    tried,
    revealed: situation.revealed,
    lines: { instruction: 'q.ask', feedback: 'q.feedback', hint: 'q.hint' },
    seconds,
  };
}

/** What is shown, with the voice left out: the lines take no time when nobody hears them. */
function scriptFor(situation: Situation): Script {
  const script = chooseScript(situationOf(situation, () => 0));
  return { ...script, moments: script.moments.filter((moment) => moment.sound?.kind !== 'say') };
}

/** The same, with every line taking a second and a half to say. */
const spoken = (situation: Situation): Script => chooseScript(situationOf(situation, () => 1.5));

const said = (script: Script): string[] =>
  script.moments.flatMap((moment) => (moment.sound?.kind === 'say' ? [moment.sound.key] : []));

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

describe('the voice', () => {
  it('says what is asked before anything is shown, and waits for the words', () => {
    const quiet = scriptFor({ ...base, stage: 'guided', amount: 2 });
    const heard = spoken({ ...base, stage: 'guided', amount: 2 });
    expect(said(heard)).toEqual(['q.ask']);
    const asking = (script: Script) =>
      script.moments.find((moment) => moment.beat?.show === 'ask')?.at ?? -1;
    // The question is put only once it has been said.
    expect(asking(heard) - asking(quiet)).toBeGreaterThanOrEqual(1500);
  });

  it('in a demonstration says "watch" first, then the question', () => {
    expect(said(spoken({ ...base, stage: 'demo' }))).toEqual(['lesson.watch', 'q.ask']);
  });

  it('says what there is to say about an answer or a hint, once', () => {
    expect(said(spoken({ ...base, event: 'correct' }))).toEqual(['q.feedback']);
    expect(said(spoken({ ...base, event: 'incorrect', triedAmount: 3 }))).toEqual(['q.feedback']);
    expect(said(spoken({ ...base, event: 'hint-model' }))).toEqual(['q.hint']);
    expect(said(spoken({ ...base, event: 'hint-reveal' }))).toEqual(['q.hint']);
  });

  it('takes no time at all when it will not be heard', () => {
    for (const event of ['new', 'correct', 'incorrect', 'hint-model'] as const) {
      const situation = { ...base, event, triedAmount: event === 'incorrect' ? 3 : null };
      expect(chooseScript(situationOf(situation, () => 0)).length).toBe(
        scriptFor(situation).length,
      );
    }
  });
});

describe('a group to be taken in at a glance', () => {
  const glance = { ...base, glance: true };

  it('is uncovered for a moment and covered again, and is not counted: seeing how many is the game', () => {
    const script = scriptFor({ ...glance, amount: 3 });
    expect(beats(script)).toEqual([{ show: 'glance' }, { show: 'rest' }]);
    expect(script.moments.some((moment) => moment.sound?.kind === 'count')).toBe(false);
    expect(script.length).toBeGreaterThanOrEqual(GLANCE_TIME);
  });

  it('is counted once an answer has been given, right or wrong', () => {
    expect(beats(scriptFor({ ...glance, event: 'correct', amount: 3 }))).toContainEqual({
      show: 'count',
      group: 'prompt',
    });
    expect(
      beats(scriptFor({ ...glance, event: 'incorrect', amount: 3, triedAmount: 2 })),
    ).toContainEqual({ show: 'count', group: 'prompt' });
  });

  it('is shown again as help, not counted', () => {
    expect(beats(scriptFor({ ...glance, event: 'hint-model' }))).toEqual([
      { show: 'glance' },
      { show: 'rest' },
    ]);
  });

  it('is not shown again for the asking: asking is free, and another look is help', () => {
    expect(beats(scriptFor({ ...glance, again: true }))).not.toContainEqual({ show: 'glance' });
  });
});

describe('giving out so many', () => {
  const giving = (stage: Stage, event: ScriptEvent, wanted: number, given: number | null = null) =>
    giveScript({
      stage,
      event,
      again: false,
      wanted,
      given,
      lines: { instruction: 'g.ask', feedback: 'g.feedback', hint: 'g.hint' },
      seconds: () => 0,
    });

  it('in a demonstration gives one at a time with a counting word for each, then counts both sides', () => {
    const script = giving('demo', 'new', 3);
    expect(beats(script).filter((beat) => beat.show === 'do')).toEqual([
      { show: 'do', parts: 0 },
      { show: 'do', parts: 1 },
      { show: 'do', parts: 2 },
      { show: 'do', parts: 3 },
    ]);
    expect(said(script)).toEqual(['lesson.watch', 'g.ask', 'count.1', 'count.2', 'count.3']);
    expect(notesDuring(script, 'prompt')).toEqual([0, 1, 2]);
    expect(notesDuring(script, 'answer')).toEqual([0, 1, 2]);
    expect(script.settled).toEqual({ show: 'same' });
  });

  it('counts the friends with the child on a guided step, and not on an independent one', () => {
    expect(notesDuring(giving('guided', 'new', 4), 'prompt')).toEqual([0, 1, 2, 3]);
    expect(giving('independent', 'new', 4).moments.some((m) => m.sound?.kind === 'count')).toBe(
      false,
    );
  });

  it('after a wrong amount, counts the friends and then what was given: a different number of notes', () => {
    const script = giving('independent', 'incorrect', 4, 5);
    expect(notesDuring(script, 'prompt')).toEqual([0, 1, 2, 3]);
    expect(notesDuring(script, 'tried')).toEqual([0, 1, 2, 3, 4]);
    expect(script.moments.some((moment) => moment.sound?.kind === 'cue')).toBe(false);
  });

  it('never takes longer than a small child will watch, even with ten', () => {
    expect(giving('demo', 'new', 5).length).toBeLessThan(12000);
    expect(giving('independent', 'correct', 10).length).toBeLessThan(12000);
  });
});
