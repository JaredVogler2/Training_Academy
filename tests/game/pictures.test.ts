import { describe, expect, it } from 'vitest';
import { LETTERS } from '@/art/letters';
import lexiconFile from '@/art/lexicon.json';
import { PICTURES, isPictureId, wordFor } from '@/art/pictures';

/**
 * The picture kit, the lexicon and the letters are three files that have to agree: a word with no picture cannot be
 * shown, a picture with no word cannot be said, and a letter with no shape cannot be taught.
 */

interface Entry {
  word: string;
  starts?: string;
  letters?: string[];
  beats?: string[];
}
const lexicon = lexiconFile.words as Record<string, Entry>;

describe('the picture kit and the lexicon', () => {
  it('have exactly the same things in them', () => {
    expect(Object.keys(PICTURES).sort()).toEqual(Object.keys(lexicon).sort());
  });

  it('call each thing by the same word', () => {
    for (const [id, entry] of Object.entries(lexicon)) {
      expect(wordFor(id), id).toBe(entry.word);
    }
  });

  it('know a picture from a word that is not one', () => {
    expect(isPictureId('sun')).toBe(true);
    expect(isPictureId('toString')).toBe(false);
    expect(wordFor('no-such-thing')).toBe('no-such-thing');
  });
});

describe('the words Reading Cove teaches with', () => {
  const starts = Object.values(lexicon).flatMap((entry) => (entry.starts ? [entry.starts] : []));
  const spelt = Object.entries(lexicon).filter(([, entry]) => entry.letters);

  it('have a drawn shape for every letter a word starts with or is spelt with', () => {
    const needed = new Set([...starts, ...spelt.flatMap(([, entry]) => entry.letters ?? [])]);
    // One letter, or the two that write one sound: each of them has to have a shape.
    for (const sound of needed) {
      expect(sound.length, sound).toBeLessThanOrEqual(2);
      for (const letter of sound) expect(LETTERS, sound).toContain(letter);
    }
  });

  it('write a sound with two letters only where it is one of the three pairs that are taught', () => {
    const pairs = new Set(
      [...starts, ...spelt.flatMap(([, entry]) => entry.letters ?? [])].filter(
        (sound) => sound.length === 2,
      ),
    );
    expect([...pairs].sort()).toEqual(['ch', 'sh', 'th']);
  });

  it('start with the letter the lexicon says, whenever they are spelt as they sound', () => {
    for (const [id, entry] of spelt) {
      expect(entry.letters?.join(''), id).toBe(entry.word);
      expect(entry.starts, id).toBe(entry.letters?.[0]);
      // Three sounds: a consonant, a short vowel, a consonant. (Three letters, or four where one sound has two.)
      expect(entry.letters, id).toHaveLength(3);
      expect('aeiou', id).toContain(entry.letters?.[1]);
    }
  });

  it('give every letter at least one word of its own, and most of them three', () => {
    const count = new Map<string, number>();
    for (const letter of starts) count.set(letter, (count.get(letter) ?? 0) + 1);
    for (const letter of LETTERS) expect(count.get(letter) ?? 0, letter).toBeGreaterThanOrEqual(1);
    for (const pair of ['sh', 'ch', 'th'])
      expect(count.get(pair) ?? 0, pair).toBeGreaterThanOrEqual(1);
    const thin = LETTERS.filter((letter) => (count.get(letter) ?? 0) < 3);
    // The short vowels are hard to find first-sound pictures for; these are known to be thin.
    expect(thin.sort()).toEqual(['e', 'i', 'o', 'u']);
  });

  it('are thirty-three words that can be sounded out, seven of them with a pair of letters', () => {
    // "nut" is in the kit as a picture and is not one of them: the voice does not say it clearly enough.
    expect(spelt).toHaveLength(33);
    const withPair = spelt.filter(([, entry]) =>
      entry.letters?.some((sound) => sound.length === 2),
    );
    expect(withPair.map(([id]) => id).sort()).toEqual([
      'chin',
      'chip',
      'fish',
      'moth',
      'path',
      'ship',
      'shop',
    ]);
  });

  it('say how a word is clapped only in beats that make the word', () => {
    const clapped = Object.entries(lexicon).filter(([, entry]) => entry.beats);
    for (const [id, entry] of clapped) {
      expect(entry.beats?.join(''), id).toBe(entry.word);
      expect(entry.beats?.length, id).toBeLessThanOrEqual(3);
    }
    // Every count there is a card for has words to clap.
    for (const beats of [1, 2, 3]) {
      expect(clapped.filter(([, entry]) => entry.beats?.length === beats).length).toBeGreaterThan(
        3,
      );
    }
  });
});
