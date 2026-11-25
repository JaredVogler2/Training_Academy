import type { Stimulus } from './schema';

/**
 * The pictures Reading Cove asks its later questions with, read into something that can be reasoned about: a word
 * to find a rhyme for, a word to clap, a card with claps on it, a sentence in print, and one thing on or in
 * another. Nothing here draws anything, and nothing here knows a word: what a word's beats are, or how it is
 * spelt, is the lexicon's to say (src/art/lexicon.json).
 *
 * The content rules, the scripts and the drawings all ask this, so they cannot disagree about what a picture is.
 */

/** The most claps there is a card for. */
export const CLAPS_MOST = 3;
/** The little words that say where a thing is. */
export const PLACINGS = ['on', 'in'] as const;
export type Placing = (typeof PLACINGS)[number];

export type ReadingPicture =
  /** A word, shown as its picture, for which a rhyme is to be found. */
  | { kind: 'rhyme'; word: string }
  /** A word, shown as its picture, to be clapped in its beats. */
  | { kind: 'beats'; word: string }
  /** So many claps, on a card. */
  | { kind: 'claps'; count: number }
  /** Words in print, in a row, to be read. */
  | { kind: 'sentence'; words: string[] }
  /** One thing on another, or in it: what a sentence tells of. */
  | { kind: 'placed'; thing: string; how: Placing; base: string };

const WORD = /^[a-z]+$/;
const isWord = (value: unknown): value is string => typeof value === 'string' && WORD.test(value);
const isPlacing = (value: unknown): value is Placing =>
  typeof value === 'string' && (PLACINGS as readonly string[]).includes(value);

/** What a picture of Reading Cove's is, or `null` for one that is not well made (or is not one of them). */
export function readReadingPicture(stimulus: Stimulus): ReadingPicture | null {
  if (stimulus.type !== 'scene') return null;
  const { scene, of } = stimulus;
  const keys = Object.keys(of).sort().join(',');
  switch (scene) {
    case 'rhyme':
    case 'beats':
      return keys === 'word' && isWord(of.word) ? { kind: scene, word: of.word } : null;
    case 'claps': {
      const { count } = of;
      const whole = typeof count === 'number' && Number.isInteger(count);
      return keys === 'count' && whole && count >= 1 && count <= CLAPS_MOST
        ? { kind: 'claps', count }
        : null;
    }
    case 'sentence': {
      const { words } = of;
      if (keys !== 'words' || !Array.isArray(words) || words.length < 2 || words.length > 6) {
        return null;
      }
      return words.every(isWord) ? { kind: 'sentence', words: [...words] } : null;
    }
    case 'placed': {
      const { thing, how, base } = of;
      if (keys !== 'base,how,thing' || !isWord(thing) || !isWord(base) || !isPlacing(how)) {
        return null;
      }
      return thing === base ? null : { kind: 'placed', thing, how, base };
    }
    default:
      return null;
  }
}

/** The words that tell of one thing on or in another: "a cat on a mat". */
export function sentenceFor(placed: { thing: string; how: Placing; base: string }): string[] {
  return ['a', placed.thing, placed.how, 'a', placed.base];
}

/** What a sentence tells of, where it is one of those: a thing, where it is, and what it is on or in. */
export function placedBy(
  words: readonly string[],
): { thing: string; how: Placing; base: string } | null {
  const [first, thing, how, second, base, ...more] = words;
  if (first !== 'a' || second !== 'a' || more.length > 0) return null;
  if (thing === undefined || base === undefined || !isPlacing(how) || thing === base) return null;
  return { thing, how, base };
}

/** The clip in which a sentence is read aloud: "sentence.cat-on-mat". `null` for one there is no clip for. */
export function sentenceClip(words: readonly string[]): string | null {
  const placed = placedBy(words);
  return placed ? `sentence.${placed.thing}-${placed.how}-${placed.base}` : null;
}

/** What a wrong number of claps says, for the grown-up report. */
export function clapsMisconception(beats: number, chosen: number): string {
  const difference = chosen - beats;
  if (difference === 1) return 'one-more';
  if (difference === -1) return 'one-fewer';
  return difference > 0 ? 'many-more' : 'many-fewer';
}

/** What a picture that is not what the sentence says has got wrong, for the grown-up report. */
export function placedMisconception(
  right: { thing: string; how: Placing; base: string },
  shown: { thing: string; how: Placing; base: string },
): string {
  if (shown.thing === right.base && shown.base === right.thing) return 'words-swapped';
  if (shown.how !== right.how) return 'little-word-misread';
  return shown.thing !== right.thing ? 'first-word-misread' : 'last-word-misread';
}
