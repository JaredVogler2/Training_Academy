import lexiconFile from '@/art/lexicon.json';

/** What Reading Cove knows of a word, from the lexicon (src/art/lexicon.json). */
export interface Entry {
  word: string;
  /** The letter, or the pair of letters, whose sound it starts with, where that is a sound that is taught. */
  starts?: string;
  /** The word as it is spelt, one entry for each sound, where it is spelt as it sounds. */
  letters?: string[];
  /** The word in the beats it is clapped in. */
  beats?: string[];
}

export const lexicon: Readonly<Record<string, Entry>> = lexiconFile.words;

/** A word sound by sound: "ship" is sh, i, p. Empty for a word that is not spelt as it sounds. */
export const lettersOf = (id: string): string[] => lexicon[id]?.letters ?? [];

/** How many beats a word is clapped in; 0 for a word nothing says that of. */
export const beatsIn = (id: string): number => lexicon[id]?.beats?.length ?? 0;
