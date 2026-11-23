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
    for (const letter of needed) expect(LETTERS, letter).toContain(letter);
  });

  it('start with the letter the lexicon says, whenever they are spelt as they sound', () => {
    for (const [id, entry] of spelt) {
      expect(entry.letters?.join(''), id).toBe(entry.word);
      expect(entry.starts, id).toBe(entry.letters?.[0]);
      // Three letters, three sounds: a consonant, a short vowel, a consonant.
      expect(entry.letters, id).toHaveLength(3);
      expect('aeiou', id).toContain(entry.letters?.[1]);
    }
  });

  it('give every letter at least one word of its own, and most of them three', () => {
    const count = new Map<string, number>();
    for (const letter of starts) count.set(letter, (count.get(letter) ?? 0) + 1);
    for (const letter of LETTERS) expect(count.get(letter) ?? 0, letter).toBeGreaterThanOrEqual(1);
    const thin = LETTERS.filter((letter) => (count.get(letter) ?? 0) < 3);
    // The short vowels are hard to find first-sound pictures for; these are known to be thin.
    expect(thin.sort()).toEqual(['e', 'i', 'o', 'u']);
  });

  it('are twenty-six words that can be sounded out', () => {
    // "nut" is in the kit as a picture and is not one of them: the voice does not say it clearly enough.
    expect(spelt).toHaveLength(26);
  });
});
