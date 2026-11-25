import { ITEM_KINDS, type ItemKind, type Stimulus } from './schema';

/**
 * The pictures Number Garden asks its later questions with, read into something that can be reasoned about: a
 * numeral, a tower of blocks, a staircase with a step missing, a frame of five or ten places, a path of numbered
 * stones, a little story in which some come or some go. Pure arithmetic: nothing here draws anything.
 *
 * Each of them stands for one amount — how many it shows, or how many it asks for — and that is what makes an
 * answer right: the choice that stands for the same amount as the question.
 */

/** The largest amount Number Garden shows or names. */
export const NUMBER_MOST = 10;
/** The tallest tower of blocks there is room to draw. */
export const TOWER_MOST = 6;
/** How many steps a staircase, or stones a path, can have. */
export const RUN_LEAST = 3;
export const RUN_MOST = 5;

export type NumberPicture =
  /** A set of things. */
  | { kind: 'group'; item: ItemKind; count: number }
  | { kind: 'numeral'; value: number }
  /** A number said aloud: something to listen to. */
  | { kind: 'spoken'; value: number }
  | { kind: 'tower'; count: number }
  /**
   * Towers side by side, each one block taller (or shorter) than the one before, with one of them missing.
   * `heights` has the missing one filled in; `gap` says which it is.
   */
  | { kind: 'stairs'; heights: number[]; gap: number; step: 1 | -1 }
  /**
   * A frame of five places, or of ten in two lines of five. What is asked about it is either how many it holds,
   * or how many more would fill it.
   */
  | { kind: 'frame'; item: ItemKind; places: boolean[]; filled: number; asks: 'filled' | 'empty' }
  /** Stones in a line with the numbers on them in order, one stone bare. `numbers` has the bare one filled in. */
  | { kind: 'path'; numbers: number[]; gap: number; step: 1 | -1 }
  /** Some are there; then some more come, or some go away. `result` is how many there are afterwards. */
  | {
      kind: 'story';
      change: 'join' | 'leave';
      item: ItemKind;
      start: number;
      moved: number;
      result: number;
    };

const whole = (value: unknown, least: number, most: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= least && value <= most;

const isItem = (value: unknown): value is ItemKind =>
  typeof value === 'string' && (ITEM_KINDS as readonly string[]).includes(value);

const SPOKEN = /^count\.(\d{1,2})$/;

/** The clip that says a number: "count.3" says "three". */
export function numberClip(value: number): string {
  return `count.${String(value)}`;
}

function readStairs(of: Record<string, unknown>): NumberPicture | null {
  const { heights } = of;
  if (!Array.isArray(heights) || heights.length < RUN_LEAST || heights.length > RUN_MOST) {
    return null;
  }
  if (!heights.every((height): height is number => whole(height, 0, TOWER_MOST))) return null;
  const gap = heights.indexOf(0);
  if (gap < 0 || heights.lastIndexOf(0) !== gap) return null;
  // Two steps that are there say which way the stairs go; every other step has to agree with them.
  const known = heights.flatMap((height, index) => (index === gap ? [] : [{ height, index }]));
  const [first, second] = known;
  if (!first || !second) return null;
  const step = (second.height - first.height) / (second.index - first.index);
  if (step !== 1 && step !== -1) return null;
  const complete = heights.map((_, index) => first.height + step * (index - first.index));
  if (!known.every(({ height, index }) => complete[index] === height)) return null;
  if (!whole(complete[gap], 1, TOWER_MOST)) return null;
  return { kind: 'stairs', heights: complete, gap, step };
}

function readFrame(of: Record<string, unknown>): NumberPicture | null {
  const { places, item, count } = of;
  if (!Array.isArray(places) || (places.length !== 5 && places.length !== 10)) return null;
  if (!places.every((place) => place === 0 || place === 1)) return null;
  if (!isItem(item)) return null;
  if (count !== undefined && count !== 'empty') return null;
  const held = places.map((place) => place === 1);
  return {
    kind: 'frame',
    item,
    places: held,
    filled: held.filter(Boolean).length,
    asks: count === 'empty' ? 'empty' : 'filled',
  };
}

function readPath(of: Record<string, unknown>): NumberPicture | null {
  const { from, to, gap } = of;
  if (!whole(from, 0, NUMBER_MOST) || !whole(to, 0, NUMBER_MOST) || from === to) return null;
  const step = to > from ? 1 : -1;
  const length = Math.abs(to - from) + 1;
  if (length < RUN_LEAST || length > RUN_MOST) return null;
  const numbers = Array.from({ length }, (_, index) => from + step * index);
  if (!whole(gap, 0, NUMBER_MOST) || !numbers.includes(gap)) return null;
  return { kind: 'path', numbers, gap: numbers.indexOf(gap), step };
}

function readStory(of: Record<string, unknown>): NumberPicture | null {
  const { kind, item, start, change } = of;
  if (kind !== 'join' && kind !== 'leave') return null;
  if (!isItem(item) || !whole(start, 1, NUMBER_MOST) || !whole(change, 1, NUMBER_MOST)) return null;
  const result = kind === 'join' ? start + change : start - change;
  if (!whole(result, 0, NUMBER_MOST)) return null;
  return { kind: 'story', change: kind, item, start, moved: change, result };
}

/** Read one of Number Garden's number pictures. `null` for anything else, and for one that is not well made. */
export function readNumberPicture(stimulus: Stimulus): NumberPicture | null {
  if (stimulus.type === 'quantity') {
    return { kind: 'group', item: stimulus.item, count: stimulus.count };
  }
  if (stimulus.type === 'sound') {
    const match = SPOKEN.exec(stimulus.clip);
    const value = match ? Number(match[1]) : NaN;
    return whole(value, 0, NUMBER_MOST) ? { kind: 'spoken', value } : null;
  }
  if (stimulus.type !== 'scene') return null;
  const of: Record<string, unknown> = stimulus.of;
  switch (stimulus.scene) {
    case 'numeral':
      return whole(of.value, 0, NUMBER_MOST) ? { kind: 'numeral', value: of.value } : null;
    case 'tower':
      return whole(of.count, 1, TOWER_MOST) ? { kind: 'tower', count: of.count } : null;
    case 'stairs':
      return readStairs(of);
    case 'frame':
      return readFrame(of);
    case 'path':
      return readPath(of);
    case 'story':
      return readStory(of);
    default:
      return null;
  }
}

/** The amount a picture stands for: how many it shows, or — where it is a question — how many it asks for. */
export function amountOf(picture: NumberPicture): number {
  switch (picture.kind) {
    case 'group':
    case 'tower':
      return picture.count;
    case 'numeral':
    case 'spoken':
      return picture.value;
    case 'stairs':
      return picture.heights[picture.gap] ?? 0;
    case 'frame':
      return picture.asks === 'empty' ? picture.places.length - picture.filled : picture.filled;
    case 'path':
      return picture.numbers[picture.gap] ?? 0;
    case 'story':
      return picture.result;
  }
}

/** The amount a stimulus stands for, or `null` where it is not one of Number Garden's number pictures. */
export function amountShown(stimulus: Stimulus | undefined): number | null {
  if (!stimulus) return null;
  const picture = readNumberPicture(stimulus);
  return picture ? amountOf(picture) : null;
}

/**
 * How many separate things there are to count in a picture, one by one: the things of a group, the blocks of a
 * tower, the dots a numeral shows while it is counted, the places of a frame that are asked about, everyone in a
 * story who is there at the end. A staircase, a path and a spoken number are not counted this way.
 */
export function countableIn(picture: NumberPicture): number {
  switch (picture.kind) {
    case 'stairs':
    case 'path':
    case 'spoken':
      return 0;
    case 'group':
    case 'numeral':
    case 'tower':
    case 'frame':
    case 'story':
      return amountOf(picture);
  }
}

/**
 * Why a wrong number is tempting. Some wrong answers are an idea of their own — counting only the ones that were
 * there to begin with, or the places that are already full — and are named for it; a numeral can be taken for the
 * one that looks like it; anything else is named by how far off it is.
 */
export function numberMisconception(
  asked: NumberPicture,
  chosen: number,
  numerals = false,
): string {
  const target = amountOf(asked);
  if (asked.kind === 'story') {
    if (chosen === asked.start) return 'counted-what-was-there-first';
    if (chosen === asked.moved) {
      return asked.change === 'join' ? 'counted-those-that-came' : 'counted-those-that-left';
    }
  }
  if (asked.kind === 'frame' && asked.asks === 'empty' && chosen === asked.filled) {
    return 'counted-the-full-places';
  }
  if (numerals && ((target === 6 && chosen === 9) || (target === 9 && chosen === 6))) {
    return 'looks-alike';
  }
  const difference = chosen - target;
  if (difference === 1) return 'one-more';
  if (difference === -1) return 'one-fewer';
  return difference > 0 ? 'many-more' : 'many-fewer';
}
