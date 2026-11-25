import { describe, expect, it } from 'vitest';
import type { Stimulus } from '@/engine';
import { NAME_TIME, type Beat, type ChooseSituation, type Script } from '@/game/lesson/script';
import {
  STEP_TIME,
  STORY_BEFORE,
  STORY_MOVING,
  chooseScript,
  countingTime,
} from '@/game/worlds/number-garden/script';

/**
 * How Number Garden shows off the questions that bring numerals in. A script is only a list of moments, so what a
 * child would see and hear can be read from it here, without a screen.
 */

const group = (count: number, item: 'leaf' | 'snail' | 'frog' = 'leaf'): Stimulus => ({
  type: 'quantity',
  item,
  count,
  arrangement: 'row',
});
const numeral = (value: number): Stimulus => ({ type: 'scene', scene: 'numeral', of: { value } });
const tower = (count: number): Stimulus => ({ type: 'scene', scene: 'tower', of: { count } });
const stairs = (heights: number[]): Stimulus => ({
  type: 'scene',
  scene: 'stairs',
  of: { heights },
});
const path = (from: number, to: number, gap: number): Stimulus => ({
  type: 'scene',
  scene: 'path',
  of: { from, to, gap },
});
const frame = (places: number[], empty = false): Stimulus => ({
  type: 'scene',
  scene: 'frame',
  of: { places, item: 'acorn', ...(empty ? { count: 'empty' } : {}) },
});
const story = (kind: 'join' | 'leave', start: number, change: number): Stimulus => ({
  type: 'scene',
  scene: 'story',
  of: { kind, item: 'frog', start, change },
});
const spoken = (value: number): Stimulus => ({ type: 'sound', clip: `count.${String(value)}` });

interface Asked {
  prompt: Stimulus;
  /** The right choice, and one wrong one. */
  right: Stimulus;
  wrong: Stimulus;
}

function situation(
  asked: Asked,
  over: Partial<Pick<ChooseSituation, 'stage' | 'event' | 'revealed' | 'again'>> & {
    tried?: boolean;
    /** How long every line takes to say, in seconds. Nothing is heard unless this is given. */
    heard?: number;
  } = {},
): ChooseSituation {
  const answer = { id: 'right', stimulus: asked.right };
  const other = { id: 'wrong', stimulus: asked.wrong };
  const event = over.event ?? 'new';
  const stage = over.stage ?? 'independent';
  // The lesson shows which choice is right in a demonstration, once an answer has been given, and when it reveals it.
  const shown =
    stage === 'demo' || event === 'correct' || event === 'hint-reveal' || over.revealed === true;
  return {
    stage,
    event,
    prompt: asked.prompt,
    glance: false,
    again: over.again ?? false,
    choices: [answer, other],
    answer: shown ? answer : null,
    tried: over.tried ? other : null,
    revealed: over.revealed ?? false,
    lines: { instruction: 'q.ask', feedback: 'q.feedback', hint: 'q.hint' },
    seconds: () => over.heard ?? 0,
  };
}

const said = (script: Script): string[] =>
  script.moments.flatMap((moment) => (moment.sound?.kind === 'say' ? [moment.sound.key] : []));
const beats = (script: Script): Beat[] =>
  script.moments.flatMap((moment) => (moment.beat ? [moment.beat] : []));
const notes = (script: Script): number[] =>
  script.moments.flatMap((moment) => (moment.sound?.kind === 'count' ? [moment.sound.index] : []));
const counted = (script: Script): string[] =>
  beats(script).flatMap((beat) => (beat.show === 'count' ? [beat.group] : []));
/** Who is lifted, in order: "prompt/2" is the third thing in what is asked about. */
const lifted = (script: Script): string[] =>
  beats(script).flatMap((beat) =>
    beat.show === 'name'
      ? [beat.part === undefined ? beat.which : `${beat.which}/${String(beat.part)}`]
      : [],
  );

describe('a group, and the numeral for it', () => {
  const three: Asked = { prompt: group(3, 'snail'), right: numeral(3), wrong: numeral(4) };

  it('is shown off by counting the group, saying how many, and counting the numeral out in dots', () => {
    const script = chooseScript(situation(three, { stage: 'demo' }));
    expect(said(script)).toEqual(['lesson.watch', 'q.ask', 'count.3']);
    expect(counted(script)).toEqual(['prompt', 'answer']);
    // The same number of notes for each: three for the snails, three for the dots under the numeral.
    expect(notes(script)).toEqual([0, 1, 2, 0, 1, 2]);
    expect(script.settled).toEqual({ show: 'same' });
  });

  it('is asked of a child on their own without anything being counted or named', () => {
    const script = chooseScript(situation(three));
    expect(said(script)).toEqual(['q.ask']);
    expect(counted(script)).toEqual([]);
    expect(notes(script)).toEqual([]);
    expect(script.settled).toEqual({ show: 'rest' });
  });

  it('is counted with the child on a guided step, and the amount said: but no numeral is pointed out', () => {
    const script = chooseScript(situation(three, { stage: 'guided' }));
    expect(said(script)).toEqual(['q.ask', 'count.3']);
    expect(counted(script)).toEqual(['prompt']);
    expect(lifted(script)).toEqual([]);
  });

  it('after a right answer, counts both and lights them together', () => {
    const script = chooseScript(situation(three, { event: 'correct' }));
    expect(counted(script)).toEqual(['prompt', 'answer']);
    expect(said(script)).toEqual(['count.3', 'q.feedback']);
    expect(script.settled).toEqual({ show: 'same' });
  });

  it('after a wrong answer, counts the group and the numeral that was tried, and says both amounts', () => {
    const script = chooseScript(situation(three, { event: 'incorrect', tried: true }));
    expect(said(script)).toEqual(['q.feedback', 'count.3', 'count.4']);
    expect(counted(script)).toEqual(['prompt', 'tried']);
    // Three notes, and then four: a different amount, heard as well as seen.
    expect(notes(script)).toEqual([0, 1, 2, 0, 1, 2, 3]);
    expect(script.settled).toEqual({ show: 'rest' });
  });

  it('counts the answer after a wrong one only when the lesson has gone on to show it', () => {
    const script = chooseScript(
      situation(three, { event: 'incorrect', tried: true, revealed: true }),
    );
    expect(counted(script)).toEqual(['prompt', 'tried', 'answer']);
  });

  it('as help, counts the group; and as the last help, counts the numeral that is right', () => {
    expect(counted(chooseScript(situation(three, { event: 'hint-model' })))).toEqual(['prompt']);
    expect(counted(chooseScript(situation(three, { event: 'hint-reveal' })))).toEqual(['answer']);
  });

  it('takes as long as the counting takes, and longer when the lines are heard', () => {
    const quiet = chooseScript(situation(three, { event: 'correct' }));
    expect(quiet.length).toBeGreaterThanOrEqual(2 * countingTime(3));
    const heard = chooseScript(situation(three, { event: 'correct', heard: 1 }));
    expect(heard.length).toBeGreaterThan(quiet.length + 1900);
  });
});

describe('a numeral, and the group for it', () => {
  const four: Asked = { prompt: numeral(4), right: group(4), wrong: group(2) };

  it('counts the numeral out in dots, and then the group', () => {
    const script = chooseScript(situation(four, { stage: 'demo' }));
    expect(notes(script)).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
    expect(said(script)).toContain('count.4');
  });

  it('after a wrong answer, counts the group that was tried and says how many that was', () => {
    const script = chooseScript(situation(four, { event: 'incorrect', tried: true }));
    expect(said(script)).toEqual(['q.feedback', 'count.4', 'count.2']);
    expect(notes(script)).toEqual([0, 1, 2, 3, 0, 1]);
  });
});

describe('zero', () => {
  const none: Asked = {
    prompt: frame(Array<number>(10).fill(0)),
    right: numeral(0),
    wrong: numeral(1),
  };

  it('is counted in no time at all, and called zero', () => {
    const script = chooseScript(situation(none, { stage: 'guided' }));
    expect(said(script)).toEqual(['q.ask', 'count.0']);
    expect(notes(script)).toEqual([]);
  });
});

describe('a frame to be filled', () => {
  const three: Asked = { prompt: frame([1, 1, 0, 0, 0], true), right: group(3), wrong: group(2) };

  it('counts the empty places, not the full ones', () => {
    const script = chooseScript(situation(three, { stage: 'guided' }));
    expect(notes(script)).toEqual([0, 1, 2]);
    expect(said(script)).toEqual(['q.ask', 'count.3']);
  });

  it('answers the group that is as many as the full places by counting it: two, where three were wanted', () => {
    const script = chooseScript(situation(three, { event: 'incorrect', tried: true }));
    expect(said(script)).toEqual(['q.feedback', 'count.3', 'count.2']);
  });
});

describe('a story', () => {
  const join: Asked = {
    prompt: story('join', 3, 2),
    right: group(5, 'frog'),
    wrong: group(3, 'frog'),
  };
  const leave: Asked = { prompt: story('leave', 5, 2), right: numeral(3), wrong: numeral(5) };

  it('is shown from its first moment as it stood before anyone moved', () => {
    for (const stage of ['demo', 'guided', 'independent'] as const) {
      const script = chooseScript(situation(join, { stage }));
      expect(script.moments[0], stage).toEqual({
        at: 0,
        beat: { show: 'name', which: 'prompt', part: 0 },
      });
    }
  });

  it('happens as its question is put: those who come, come as the words are said', () => {
    const script = chooseScript(situation(join, { heard: 2 }));
    expect(lifted(script)).toEqual(['prompt/0', 'prompt/1']);
    const [before, after] = script.moments.filter((moment) => moment.beat?.show === 'name');
    expect((after?.at ?? 0) - (before?.at ?? 0)).toBe(250 + STORY_BEFORE);
    const words = script.moments.find((moment) => moment.sound?.kind === 'say');
    expect(words?.at).toBe(after?.at);
    // The question is put only once the story has been told.
    const ask = script.moments.find((moment) => moment.beat?.show === 'ask');
    expect(ask?.at ?? 0).toBeGreaterThan((after?.at ?? Infinity) + 2000);
  });

  it('takes its time over the moving even where the words are not heard', () => {
    const script = chooseScript(situation(join));
    const moving = script.moments.find(
      (moment) => moment.beat?.show === 'name' && moment.beat.part === 1,
    );
    const ask = script.moments.find((moment) => moment.beat?.show === 'ask');
    expect((ask?.at ?? 0) - (moving?.at ?? 0)).toBe(STORY_MOVING);
  });

  it('is told again when a child asks to be told again: it is the question', () => {
    expect(lifted(chooseScript(situation(join, { again: true })))).toEqual([
      'prompt/0',
      'prompt/1',
    ]);
  });

  it('counts everyone once some have come: those who were there, and on through those who came', () => {
    const script = chooseScript(situation(join, { stage: 'demo' }));
    expect(notes(script)).toEqual([0, 1, 2, 3, 4, 0, 1, 2, 3, 4]);
    expect(said(script)).toEqual(['lesson.watch', 'q.ask', 'count.5']);
  });

  it('counts only those who stay once some have gone', () => {
    const script = chooseScript(situation(leave, { event: 'correct' }));
    expect(notes(script)).toEqual([0, 1, 2, 0, 1, 2]);
    expect(said(script)).toEqual(['count.3', 'q.feedback']);
  });

  it('is not told again after an answer: only counted', () => {
    expect(lifted(chooseScript(situation(leave, { event: 'correct' })))).toEqual([]);
    expect(lifted(chooseScript(situation(leave, { event: 'incorrect', tried: true })))).toEqual([]);
  });
});

describe('a staircase with a step missing', () => {
  const next: Asked = { prompt: stairs([2, 3, 4, 0]), right: tower(5), wrong: tower(4) };
  const down: Asked = { prompt: stairs([6, 0, 4, 3]), right: tower(5), wrong: tower(6) };

  it('is sung: each tower lifted in turn, playing the note of its height, with a silence where one is missing', () => {
    const script = chooseScript(situation(next, { stage: 'guided' }));
    expect(lifted(script)).toEqual(['prompt/0', 'prompt/1', 'prompt/2', 'prompt/3']);
    expect(notes(script)).toEqual([1, 2, 3]);
    const steps = script.moments.filter((moment) => moment.beat?.show === 'name');
    expect((steps[1]?.at ?? 0) - (steps[0]?.at ?? 0)).toBe(STEP_TIME);
  });

  it('is not sung to a child on their own: only asked', () => {
    const script = chooseScript(situation(next));
    expect(notes(script)).toEqual([]);
    expect(lifted(script)).toEqual([]);
  });

  it('is sung whole when the right tower is chosen: the tower itself plays the note that was missing', () => {
    const script = chooseScript(situation(next, { event: 'correct' }));
    expect(lifted(script)).toEqual(['prompt/0', 'prompt/1', 'prompt/2', 'right']);
    expect(notes(script)).toEqual([1, 2, 3, 4]);
    expect(script.settled).toEqual({ show: 'same' });
  });

  it('is sung with a wrong tower where the gap is: the same note twice, where the next one was wanted', () => {
    const script = chooseScript(situation(next, { event: 'incorrect', tried: true }));
    expect(lifted(script)).toEqual(['prompt/0', 'prompt/1', 'prompt/2', 'wrong']);
    expect(notes(script)).toEqual([1, 2, 3, 3]);
  });

  it('comes down a note at a time where the stairs go down', () => {
    const script = chooseScript(situation(down, { event: 'correct' }));
    expect(notes(script)).toEqual([5, 4, 3, 2]);
    expect(lifted(script)).toEqual(['prompt/0', 'right', 'prompt/2', 'prompt/3']);
  });

  it('is shown off first with the silence in it, and then whole', () => {
    const script = chooseScript(situation(next, { stage: 'demo' }));
    expect(notes(script)).toEqual([1, 2, 3, 1, 2, 3, 4]);
  });
});

describe('a path of numbered stones', () => {
  const next: Asked = { prompt: path(2, 5, 5), right: numeral(5), wrong: numeral(7) };
  const back: Asked = { prompt: path(10, 6, 8), right: numeral(8), wrong: numeral(5) };

  it('is walked: each stone lifted in turn and its number said, with a pause at the bare one', () => {
    const script = chooseScript(situation(next, { stage: 'guided', heard: 0.5 }));
    expect(said(script)).toEqual(['q.ask', 'count.2', 'count.3', 'count.4']);
    expect(lifted(script)).toEqual(['prompt/0', 'prompt/1', 'prompt/2', 'prompt/3']);
  });

  it('lifts each stone for its moment even where nothing is heard', () => {
    const script = chooseScript(situation(next, { stage: 'guided' }));
    const steps = script.moments.filter((moment) => moment.beat?.show === 'name');
    expect((steps[1]?.at ?? 0) - (steps[0]?.at ?? 0)).toBe(NAME_TIME);
  });

  it('is walked whole when the right number is chosen', () => {
    const script = chooseScript(situation(next, { event: 'correct' }));
    expect(said(script)).toEqual(['count.2', 'count.3', 'count.4', 'count.5', 'q.feedback']);
    expect(lifted(script)).toEqual(['prompt/0', 'prompt/1', 'prompt/2', 'right']);
  });

  it('is walked with a wrong number on the bare stone, which is heard to be out of order', () => {
    const script = chooseScript(situation(next, { event: 'incorrect', tried: true }));
    expect(said(script)).toEqual(['q.feedback', 'count.2', 'count.3', 'count.4', 'count.7']);
  });

  it('counts back where the path goes back', () => {
    const script = chooseScript(situation(back, { event: 'correct' }));
    expect(said(script).slice(0, 5)).toEqual([
      'count.10',
      'count.9',
      'count.8',
      'count.7',
      'count.6',
    ]);
  });
});

describe('a number that is said', () => {
  const seven: Asked = { prompt: spoken(7), right: numeral(7), wrong: numeral(4) };

  it('is the question itself, so it is said even to someone who has asked for less movement', () => {
    const script = chooseScript(situation(seven));
    expect(script.essential).toBe(true);
    expect(said(script)).toEqual(['q.ask', 'count.7']);
    expect(lifted(script)).toEqual(['prompt']);
  });

  it('is said again, whole, as often as it is asked for', () => {
    expect(said(chooseScript(situation(seven, { again: true })))).toEqual(['q.ask', 'count.7']);
  });

  it('names the numeral with the same word when it is found', () => {
    const script = chooseScript(situation(seven, { event: 'correct' }));
    expect(said(script)).toEqual(['count.7', 'q.feedback']);
    expect(lifted(script)).toEqual(['right']);
  });

  it('answers a wrong numeral with what it is — its dots counted, its own name — and then says the number again', () => {
    const script = chooseScript(situation(seven, { event: 'incorrect', tried: true }));
    expect(notes(script)).toEqual([0, 1, 2, 3]);
    expect(said(script)).toEqual(['count.4', 'q.feedback', 'count.7']);
    // The last thing lifted is what is listened to: nothing can be answered until it has been heard again.
    expect(lifted(script).at(-1)).toBe('prompt');
  });

  it('as help, is said again; and as the last help, the numeral is named', () => {
    expect(lifted(chooseScript(situation(seven, { event: 'hint-model' })))).toEqual(['prompt']);
    expect(lifted(chooseScript(situation(seven, { event: 'hint-reveal' })))).toEqual(['right']);
  });
});

describe('the first game of all', () => {
  it('is left as it was: a group matched with groups has no number said in it', () => {
    const same: Asked = { prompt: group(3, 'snail'), right: group(3), wrong: group(2) };
    const script = chooseScript(situation(same, { stage: 'demo' }));
    expect(said(script)).toEqual(['lesson.watch', 'q.ask']);
    expect(script.essential).toBeUndefined();
  });
});
