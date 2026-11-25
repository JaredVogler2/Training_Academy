/**
 * The little music the engine knows: what a note is called, how high it is, what shape a short tune has, and
 * whether taps kept time with a beat. Pure arithmetic: nothing here makes a sound or reads a clock.
 *
 * A note is written the way a keyboard names it, a letter and the number of its octave: "c4" is middle C, "c5" the
 * C above it. Only the white keys are used: no sharps or flats.
 */

const LETTERS = ['c', 'd', 'e', 'f', 'g', 'a', 'b'] as const;
/** Semitones above C for each white key. */
const ABOVE_C = [0, 2, 4, 5, 7, 9, 11] as const;
const NOTE = /^([a-g])([2-6])$/;

/** The white keys of one octave, from middle C to the C above: the bars of the Music Lab's keyboard. */
export const OCTAVE = ['c4', 'd4', 'e4', 'f4', 'g4', 'a4', 'b4', 'c5'] as const;

export function isNote(name: string): boolean {
  return NOTE.test(name);
}

/**
 * How high a note is, as its number on a keyboard (60 is middle C; one more is one semitone higher).
 * `null` for anything that is not a note.
 */
export function pitchOf(name: string): number | null {
  const match = NOTE.exec(name);
  if (!match) return null;
  const letter = LETTERS.indexOf(match[1] as (typeof LETTERS)[number]);
  return 12 * (Number(match[2]) + 1) + (ABOVE_C[letter] ?? 0);
}

/** The note's frequency in hertz, with the A above middle C at 440. `null` for anything that is not a note. */
export function frequencyOf(name: string): number | null {
  const pitch = pitchOf(name);
  return pitch === null ? null : 440 * 2 ** ((pitch - 69) / 12);
}

/** Which of two notes is higher: positive when `a` is, negative when `b` is, 0 when they are the same. */
export function comparePitch(a: string, b: string): number {
  return (pitchOf(a) ?? 0) - (pitchOf(b) ?? 0);
}

// ---------------------------------------------------------------------------------------------------------------------
// The shape of a tune
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The shapes a tune can be asked to have.
 *   up     every note higher than the one before
 *   down   every note lower than the one before
 *   hill   up to a top, then down again
 *   twice  the first half, and then the same again
 *   home   wherever it goes, it ends on the lowest bar there is (and does not simply stay there)
 */
export const TUNE_SHAPES = ['up', 'down', 'hill', 'twice', 'home'] as const;
export type TuneShape = (typeof TUNE_SHAPES)[number];

export interface ShapeVerdict {
  fits: boolean;
  /** What a tune that does not fit did instead, for the grown-up report. */
  problem?: string;
}

/** Whether a tune has the shape asked for. `lowest` is the lowest bar there was to play. */
export function fitsShape(shape: TuneShape, tune: readonly string[], lowest: string): ShapeVerdict {
  const pitches = tune.map((note) => pitchOf(note) ?? 0);
  const steps = pitches.slice(1).map((pitch, index) => Math.sign(pitch - (pitches[index] ?? 0)));
  const no = (problem: string): ShapeVerdict => ({ fits: false, problem });
  switch (shape) {
    case 'up':
      if (steps.includes(0)) return no('stayed-on-a-note');
      return steps.every((step) => step > 0) ? { fits: true } : no('went-down');
    case 'down':
      if (steps.includes(0)) return no('stayed-on-a-note');
      return steps.every((step) => step < 0) ? { fits: true } : no('went-up');
    case 'hill': {
      if (steps.includes(0)) return no('stayed-on-a-note');
      const top = steps.indexOf(-1);
      if (top < 0) return no('never-came-down');
      if (top === 0) return no('never-went-up');
      // Once it has started down, it keeps going down.
      return steps.slice(top).every((step) => step < 0) ? { fits: true } : no('went-up-again');
    }
    case 'twice': {
      if (tune.length % 2 !== 0) return no('not-the-same-again');
      const half = tune.length / 2;
      const repeated = tune.slice(half).every((note, index) => note === tune[index]);
      if (!repeated) return no('not-the-same-again');
      // One note said over and over is not a tune said twice.
      return new Set(tune.slice(0, half)).size > 1 ? { fits: true } : no('stayed-on-a-note');
    }
    case 'home':
      if (tune.at(-1) !== lowest) return no('did-not-come-home');
      return new Set(tune).size > 1 ? { fits: true } : no('stayed-on-a-note');
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Keeping time
// ---------------------------------------------------------------------------------------------------------------------

/** How one beat was met: by a tap in time with it, a tap too soon or too late, or no tap at all. */
export const BEAT_MARKS = ['on', 'early', 'late', 'miss'] as const;
export type BeatMark = (typeof BEAT_MARKS)[number];

/**
 * How far from a beat a tap may fall and still be in time, as a share of the time from one beat to the next.
 * Generous on purpose: what is looked for is a steady, roughly right tempo, not a drummer's precision.
 */
export const IN_TIME = 0.26;
/**
 * The most steady lateness (or earliness) that is taken to be the device's, or simply this child's way, and not
 * counted against them: as a share of the time from one beat to the next.
 */
export const STEADY_LAG_MOST = 0.35;

export interface TimeKept {
  /** One mark for each beat, in order. */
  marks: BeatMark[];
  /** Taps that met no beat: more taps than beats, or taps nowhere near one. */
  extra: number;
  /**
   * How late the taps ran on the whole, in milliseconds (negative: early). It is taken off every tap before the
   * tap is judged, because a sound that leaves the speaker late, a screen that reports a touch late and a child
   * who is steadily a shade behind are all in it, and none of them is being out of time.
   */
  lag: number;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/**
 * Say how taps kept time with beats. Both are moments on the same clock, in milliseconds; `period` is the time
 * from one beat to the next.
 *
 * Each tap goes with the beat it is nearest to, and each beat keeps only its nearest tap; the others are extra.
 * Then the taps' steady lag is taken off, and a beat is met when its tap falls within the window either side.
 */
export function keepTime(
  taps: readonly number[],
  beats: readonly number[],
  period: number,
): TimeKept {
  const nearest = new Map<number, number>();
  let extra = 0;
  for (const tap of taps) {
    let best = -1;
    let off = Infinity;
    beats.forEach((beat, index) => {
      const away = tap - beat;
      if (Math.abs(away) < Math.abs(off)) {
        best = index;
        off = away;
      }
    });
    // A tap more than half a beat from every beat belongs to none of them.
    if (best < 0 || Math.abs(off) > period / 2) {
      extra += 1;
      continue;
    }
    const held = nearest.get(best);
    if (held === undefined) nearest.set(best, off);
    else {
      extra += 1;
      if (Math.abs(off) < Math.abs(held)) nearest.set(best, off);
    }
  }
  const most = STEADY_LAG_MOST * period;
  const lag = Math.max(-most, Math.min(most, median([...nearest.values()])));
  const window = IN_TIME * period;
  const marks = beats.map((_, index): BeatMark => {
    const off = nearest.get(index);
    if (off === undefined) return 'miss';
    const away = off - lag;
    return Math.abs(away) <= window ? 'on' : away < 0 ? 'early' : 'late';
  });
  return { marks, extra, lag };
}

/** Taps kept in time, written as an answer: a mark for each beat, then how many taps were extra ("x2"), if any. */
export function writeTimeKept(kept: TimeKept): string {
  const extra = Math.min(kept.extra, 99);
  return [...kept.marks, ...(extra > 0 ? [`x${String(extra)}`] : [])].join('-');
}

/** Extra taps that are let pass, for so many beats: one stray tap in four. */
export function extraAllowed(beats: number): number {
  return Math.floor(beats / 4);
}

/** Read an answer written by `writeTimeKept`. `null` if it is not one, or is not for this many beats. */
export function readTimeKept(
  response: string,
  beats: number,
): { marks: BeatMark[]; extra: number } | null {
  const tokens = response.split('-');
  const last = tokens.at(-1) ?? '';
  const stray = /^x([1-9][0-9]?)$/.exec(last);
  const marks = stray ? tokens.slice(0, -1) : tokens;
  if (marks.length !== beats) return null;
  if (!marks.every((mark): mark is BeatMark => (BEAT_MARKS as readonly string[]).includes(mark))) {
    return null;
  }
  return { marks, extra: stray ? Number(stray[1]) : 0 };
}
