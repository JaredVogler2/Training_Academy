import { describe, expect, it } from 'vitest';
import {
  IN_TIME,
  OCTAVE,
  STEADY_LAG_MOST,
  TUNE_SHAPES,
  comparePitch,
  extraAllowed,
  fitsShape,
  frequencyOf,
  isNote,
  judgeTask,
  keepTime,
  pitchOf,
  readTimeKept,
  solutionOf,
  solutionParts,
  writeTimeKept,
  type Task,
  type TuneShape,
} from '@/engine';

/**
 * The music the engine knows: notes, the shape of a tune, and whether taps kept time with a beat. All of it is
 * arithmetic, so all of it is tried here with numbers: no sound is made and no clock is read.
 */

describe('notes', () => {
  it('are a white key and its octave, and nothing else', () => {
    for (const note of ['c4', 'a4', 'b6', 'g2']) expect(isNote(note), note).toBe(true);
    for (const note of ['h4', 'c', 'c7', 'c1', 'C4', 'cs4', '4c', '']) {
      expect(isNote(note), note).toBe(false);
      expect(pitchOf(note), note).toBeNull();
      expect(frequencyOf(note), note).toBeNull();
    }
  });

  it('are numbered as a keyboard numbers them, with the A above middle C at 440', () => {
    expect(pitchOf('c4')).toBe(60);
    expect(pitchOf('a4')).toBe(69);
    expect(pitchOf('c5')).toBe(72);
    expect(frequencyOf('a4')).toBeCloseTo(440, 6);
    expect(frequencyOf('c4')).toBeCloseTo(261.626, 2);
    // An octave up is twice as fast.
    expect(frequencyOf('c5')).toBeCloseTo(2 * (frequencyOf('c4') ?? 0), 6);
  });

  it('go up along the keyboard', () => {
    expect(OCTAVE).toHaveLength(8);
    for (const [index, note] of OCTAVE.entries()) {
      const before = OCTAVE[index - 1];
      if (before) expect(comparePitch(note, before)).toBeGreaterThan(0);
    }
    expect(comparePitch('c4', 'c4')).toBe(0);
    expect(comparePitch('b4', 'c5')).toBeLessThan(0);
  });
});

describe('the shape of a tune', () => {
  it('is one of five', () => {
    expect(TUNE_SHAPES).toEqual(['up', 'down', 'hill', 'twice', 'home']);
  });

  const shape = (name: TuneShape, ...tune: string[]) => fitsShape(name, tune, 'c4');

  it('going up: every note higher than the last', () => {
    expect(shape('up', 'c4', 'e4', 'g4')).toEqual({ fits: true });
    expect(shape('up', 'c4', 'g4', 'e4')).toEqual({ fits: false, problem: 'went-down' });
    expect(shape('up', 'c4', 'c4', 'e4')).toEqual({ fits: false, problem: 'stayed-on-a-note' });
  });

  it('going down: every note lower than the last', () => {
    expect(shape('down', 'a4', 'e4', 'c4')).toEqual({ fits: true });
    expect(shape('down', 'a4', 'c4', 'e4')).toEqual({ fits: false, problem: 'went-up' });
    expect(shape('down', 'a4', 'a4', 'c4')).toEqual({ fits: false, problem: 'stayed-on-a-note' });
  });

  it('a hill: up to a top, and then down, and not up again', () => {
    expect(shape('hill', 'd4', 'a4', 'e4')).toEqual({ fits: true });
    expect(shape('hill', 'c4', 'e4', 'a4', 'g4', 'd4')).toEqual({ fits: true });
    expect(shape('hill', 'c4', 'e4', 'g4')).toEqual({ fits: false, problem: 'never-came-down' });
    expect(shape('hill', 'g4', 'e4', 'c4')).toEqual({ fits: false, problem: 'never-went-up' });
    expect(shape('hill', 'c4', 'g4', 'e4', 'a4')).toEqual({
      fits: false,
      problem: 'went-up-again',
    });
    expect(shape('hill', 'c4', 'g4', 'g4')).toEqual({ fits: false, problem: 'stayed-on-a-note' });
  });

  it('said twice: the second half is the first half again, and it is not one note over and over', () => {
    expect(shape('twice', 'e4', 'g4', 'e4', 'g4')).toEqual({ fits: true });
    expect(shape('twice', 'c4', 'e4', 'g4', 'c4', 'e4', 'g4')).toEqual({ fits: true });
    expect(shape('twice', 'e4', 'g4', 'g4', 'e4')).toEqual({
      fits: false,
      problem: 'not-the-same-again',
    });
    expect(shape('twice', 'e4', 'g4', 'e4')).toEqual({
      fits: false,
      problem: 'not-the-same-again',
    });
    expect(shape('twice', 'e4', 'e4', 'e4', 'e4')).toEqual({
      fits: false,
      problem: 'stayed-on-a-note',
    });
  });

  it('coming home: wherever it goes, it ends on the lowest bar', () => {
    expect(shape('home', 'e4', 'a4', 'g4', 'c4')).toEqual({ fits: true });
    expect(shape('home', 'c4', 'e4', 'c4')).toEqual({ fits: true });
    expect(shape('home', 'c4', 'e4', 'g4')).toEqual({ fits: false, problem: 'did-not-come-home' });
    expect(shape('home', 'c4', 'c4', 'c4')).toEqual({ fits: false, problem: 'stayed-on-a-note' });
  });
});

describe('keeping time', () => {
  /** A beat every second, from 1000 ms: eight of them. */
  const PERIOD = 1000;
  const beats = Array.from({ length: 8 }, (_, index) => 1000 + index * PERIOD);
  const marks = (taps: number[]) => keepTime(taps, beats, PERIOD).marks.join(' ');

  it('meets every beat when every tap is on it', () => {
    const kept = keepTime(beats, beats, PERIOD);
    expect(kept).toEqual({ marks: Array.from({ length: 8 }, () => 'on'), extra: 0, lag: 0 });
  });

  it('does not ask for precision: a tap a fifth of a beat out, either way, is in time', () => {
    const wobble = [180, -200, 150, -120, 220, -180, 90, -210];
    expect(marks(beats.map((beat, index) => beat + (wobble[index] ?? 0)))).toBe(
      'on on on on on on on on',
    );
    expect(IN_TIME).toBeGreaterThanOrEqual(0.2);
  });

  it('takes a steady lateness to be the device’s, or the child’s way, and not out of time', () => {
    // A speaker that sounds a third of a second late: every tap is 320 ms after its beat, which is further out
    // than a tap may be. All of it is the same lateness, so none of it counts.
    const late = keepTime(
      beats.map((beat) => beat + 320),
      beats,
      PERIOD,
    );
    expect(320).toBeGreaterThan(IN_TIME * PERIOD);
    expect(late.lag).toBe(320);
    expect(late.marks.join(' ')).toBe('on on on on on on on on');
    // And a child who is always well ahead.
    const early = keepTime(
      beats.map((beat) => beat - 300),
      beats,
      PERIOD,
    );
    expect(early.lag).toBe(-300);
    expect(early.marks.every((mark) => mark === 'on')).toBe(true);
    // Unsteady is another matter: the same distance out, now early and now late, is out of time.
    const unsteady = keepTime(
      beats.map((beat, index) => beat + (index % 2 === 0 ? 320 : -320)),
      beats,
      PERIOD,
    );
    expect(unsteady.marks.some((mark) => mark === 'on')).toBe(false);
  });

  it('but only so much of it: taps nearly half a beat late are late', () => {
    const kept = keepTime(
      beats.map((beat) => beat + 480),
      beats,
      PERIOD,
    );
    expect(kept.lag).toBe(STEADY_LAG_MOST * PERIOD);
    // 480 late, 350 forgiven: 130 left, which is still within the margin. Later than that is not.
    expect(kept.marks.every((mark) => mark === 'on')).toBe(true);
    // (A tap exactly half a beat late is as near the next beat as its own, and is counted for neither.)
  });

  it('says which beats were missed, and which taps came too soon or too late', () => {
    // On, on, nothing, on, a tap far too late, on, a tap far too soon, on.
    const taps = [1000, 2000, 4000, 5400, 6000, 6600, 8000];
    expect(marks(taps)).toBe('on on miss on late on early on');
  });

  it('counts taps that belong to no beat, and second taps on the same beat, as extra', () => {
    // Twice as fast as the beat: every beat has a tap, and there is one between each two.
    const double = beats.flatMap((beat) => [beat, beat + 500]);
    const kept = keepTime(double, beats, PERIOD);
    expect(kept.marks.every((mark) => mark === 'on')).toBe(true);
    expect(kept.extra).toBe(8);
    // Two taps on one beat: the nearer is the one that counts.
    const twice = keepTime([1000, 1100, 2000], beats, PERIOD);
    expect(twice.extra).toBe(1);
    expect(twice.marks.slice(0, 2)).toEqual(['on', 'on']);
    // A tap long before the first beat is nobody's.
    expect(keepTime([100], beats, PERIOD).extra).toBe(1);
  });

  it('finds half-speed tapping out: every other beat is missed', () => {
    const half = beats.filter((_, index) => index % 2 === 0);
    expect(marks(half)).toBe('on miss on miss on miss on miss');
  });

  it('makes nothing of no taps at all', () => {
    expect(keepTime([], beats, PERIOD)).toEqual({
      marks: Array.from({ length: 8 }, () => 'miss'),
      extra: 0,
      lag: 0,
    });
  });

  it('works the same at any tempo: the margin is a share of the beat, not a number of milliseconds', () => {
    for (const tempo of [60, 72, 84, 100]) {
      const period = 60_000 / tempo;
      const each = Array.from({ length: 8 }, (_, index) => 500 + index * period);
      const inside = each.map((beat, index) => beat + (index % 2 ? 1 : -1) * period * 0.2);
      const outside = each.map((beat, index) => beat + (index % 2 ? 1 : -1) * period * 0.4);
      expect(
        keepTime(inside, each, period).marks.every((mark) => mark === 'on'),
        String(tempo),
      ).toBe(true);
      expect(
        keepTime(outside, each, period).marks.some((mark) => mark === 'on'),
        String(tempo),
      ).toBe(false);
    }
  });

  it('is written down as a mark for each beat, with the taps too many after it', () => {
    const kept = keepTime([1000, 2000, 2100, 4400], beats.slice(0, 4), PERIOD);
    expect(writeTimeKept(kept)).toBe('on-on-miss-late-x1');
    expect(readTimeKept('on-on-miss-late-x1', 4)).toEqual({
      marks: ['on', 'on', 'miss', 'late'],
      extra: 1,
    });
    expect(readTimeKept('on-on-on-on', 4)).toEqual({
      marks: ['on', 'on', 'on', 'on'],
      extra: 0,
    });
    // Not for this many beats, or not marks at all.
    expect(readTimeKept('on-on-on', 4)).toBeNull();
    expect(readTimeKept('on-on-on-yes', 4)).toBeNull();
    expect(readTimeKept('x2', 4)).toBeNull();
    expect(readTimeKept('on-on-on-on-x0', 4)).toBeNull();
    // More than can be written is written as the most there is.
    expect(writeTimeKept({ marks: ['on'], extra: 250, lag: 0 })).toBe('on-x99');
  });
});

describe('a beat to tap, as a task', () => {
  const task: Task = { type: 'beat', tempo: 60, lead: 4, beats: 8, need: 6 };
  const verdict = (response: string) => judgeTask(task, response);

  it('is in time when enough of the beats were met', () => {
    expect(verdict('on-on-on-on-on-on-on-on')).toEqual({ correct: true, clean: true });
    expect(verdict('on-on-late-on-miss-on-on-on')).toEqual({ correct: true, clean: true });
    // One stray tap in four beats is let pass.
    expect(extraAllowed(8)).toBe(2);
    expect(verdict('on-on-on-on-on-on-on-on-x2')).toEqual({ correct: true, clean: true });
  });

  it('is not when too few were, and says what the trouble was', () => {
    expect(verdict('on-on-on-on-on-miss-miss-miss')).toMatchObject({
      correct: false,
      misconception: 'too-few-taps',
    });
    expect(verdict('on-early-early-early-on-on-on-late')).toMatchObject({
      correct: false,
      misconception: 'ahead-of-the-beat',
    });
    expect(verdict('on-late-late-late-on-on-on-early')).toMatchObject({
      correct: false,
      misconception: 'behind-the-beat',
    });
    expect(verdict('on-late-early-miss-on-on-on-on')).toMatchObject({
      correct: false,
      misconception: 'uneven',
    });
  });

  it('is not when the drum was simply hammered: every beat met, and as many taps again', () => {
    expect(verdict('on-on-on-on-on-on-on-on-x8')).toMatchObject({
      correct: false,
      misconception: 'too-many-taps',
    });
  });

  it('refuses an answer that is not marks for this many beats', () => {
    expect(verdict('on-on-on')).toBeNull();
    expect(verdict('7')).toBeNull();
    expect(verdict('none')).toBeNull();
  });

  it('shows "every beat met" when it shows an answer', () => {
    expect(solutionOf(task)).toBe('on-on-on-on-on-on-on-on');
    expect(solutionParts(task)).toHaveLength(8);
  });
});

describe('a tune to make up, as a task', () => {
  const task: Task = {
    type: 'tune',
    notes: ['c4', 'd4', 'e4', 'g4', 'a4'],
    length: 3,
    shape: 'up',
    solution: ['c4', 'e4', 'a4'],
  };

  it('takes any tune with the shape asked for, not only the one it would show', () => {
    expect(judgeTask(task, 'c4-e4-a4')).toEqual({ correct: true, clean: true });
    expect(judgeTask(task, 'd4-e4-g4')).toEqual({ correct: true, clean: true });
    expect(judgeTask(task, 'c4-d4-a4')).toEqual({ correct: true, clean: true });
  });

  it('says what a tune of another shape did instead', () => {
    expect(judgeTask(task, 'c4-g4-e4')).toMatchObject({
      correct: false,
      misconception: 'went-down',
    });
    expect(judgeTask(task, 'e4-e4-g4')).toMatchObject({
      correct: false,
      misconception: 'stayed-on-a-note',
    });
  });

  it('refuses a tune that is too long, too short, or played on bars that are not there', () => {
    expect(judgeTask(task, 'c4-e4')).toBeNull();
    expect(judgeTask(task, 'c4-e4-g4-a4')).toBeNull();
    expect(judgeTask(task, 'c4-e4-c5')).toBeNull();
    expect(judgeTask(task, 'none')).toBeNull();
  });

  it('has the lowest bar as home', () => {
    const home: Task = { ...task, shape: 'home', solution: ['e4', 'g4', 'c4'] };
    expect(judgeTask(home, 'a4-d4-c4')).toEqual({ correct: true, clean: true });
    expect(judgeTask(home, 'a4-d4-d4')).toMatchObject({
      correct: false,
      misconception: 'did-not-come-home',
    });
  });

  it('shows the tune it was written with, note by note', () => {
    expect(solutionOf(task)).toBe('c4-e4-a4');
    expect(solutionParts(task)).toEqual(['c4', 'e4', 'a4']);
  });
});
