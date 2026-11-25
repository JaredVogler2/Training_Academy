import { describe, expect, it } from 'vitest';
import {
  CLAPS_MOST,
  clapsMisconception,
  placedBy,
  placedMisconception,
  readReadingPicture,
  sentenceClip,
  sentenceFor,
  type Stimulus,
} from '@/engine';

/**
 * The pictures only Reading Cove draws, as the engine reads them. Everything that asks what one of them is — the
 * content rules, the scripts, the drawings — asks here, so a picture that is not well made is refused once, in
 * one place, and by all of them.
 */

const scene = (name: string, of: Record<string, unknown>): Stimulus =>
  ({ type: 'scene', scene: name, of }) as Stimulus;

describe('reading one of Reading Cove’s pictures', () => {
  it('knows a word to rhyme with and a word to clap', () => {
    expect(readReadingPicture(scene('rhyme', { word: 'cat' }))).toEqual({
      kind: 'rhyme',
      word: 'cat',
    });
    expect(readReadingPicture(scene('beats', { word: 'elephant' }))).toEqual({
      kind: 'beats',
      word: 'elephant',
    });
  });

  it('knows a card of claps, from one to three', () => {
    for (let count = 1; count <= CLAPS_MOST; count++) {
      expect(readReadingPicture(scene('claps', { count }))).toEqual({ kind: 'claps', count });
    }
  });

  it('knows a sentence, and one thing on or in another', () => {
    const words = ['a', 'cat', 'on', 'a', 'mat'];
    expect(readReadingPicture(scene('sentence', { words }))).toEqual({ kind: 'sentence', words });
    expect(readReadingPicture(scene('placed', { thing: 'hen', how: 'in', base: 'hut' }))).toEqual({
      kind: 'placed',
      thing: 'hen',
      how: 'in',
      base: 'hut',
    });
  });

  it('gives back a list of words that is its own: changing it does not change the picture', () => {
    const words = ['a', 'cat', 'on', 'a', 'mat'];
    const read = readReadingPicture(scene('sentence', { words }));
    if (read?.kind !== 'sentence') throw new Error('not read');
    read.words.push('too');
    expect(words).toHaveLength(5);
  });

  it.each([
    ['no claps', scene('claps', { count: 0 })],
    ['four claps', scene('claps', { count: 4 })],
    ['half a clap', scene('claps', { count: 1.5 })],
    ['claps as a word', scene('claps', { count: 'two' })],
    ['claps with something else beside', scene('claps', { count: 2, word: 'cat' })],
    ['a word that is not a word', scene('rhyme', { word: 'Cat!' })],
    ['a word that is a number', scene('beats', { word: 3 })],
    ['a word with something else beside', scene('rhyme', { word: 'cat', also: 'hat' })],
    ['no word at all', scene('rhyme', {})],
    ['a sentence of one word', scene('sentence', { words: ['cat'] })],
    ['a sentence of seven', scene('sentence', { words: 'a b c d e f g'.split(' ') })],
    ['a sentence with a number in it', scene('sentence', { words: ['a', 3, 'on', 'a', 'mat'] })],
    ['a sentence that is not a list', scene('sentence', { words: 'a cat on a mat' })],
    ['a thing under itself', scene('placed', { thing: 'cat', how: 'on', base: 'cat' })],
    ['a thing beside another', scene('placed', { thing: 'cat', how: 'by', base: 'mat' })],
    ['a thing on nothing', scene('placed', { thing: 'cat', how: 'on' })],
    ['a scene of another world', scene('numeral', { value: 3 })],
  ])('refuses %s', (_, stimulus) => {
    expect(readReadingPicture(stimulus)).toBeNull();
  });

  it('is asked only about scenes: a plain picture is not one of these', () => {
    expect(readReadingPicture({ type: 'picture', id: 'cat' })).toBeNull();
    expect(readReadingPicture({ type: 'letter', letters: 'sh' })).toBeNull();
  });
});

describe('a sentence and what it tells of', () => {
  const placed = { thing: 'cat', how: 'on', base: 'mat' } as const;

  it('are two ways of writing the same thing', () => {
    expect(sentenceFor(placed)).toEqual(['a', 'cat', 'on', 'a', 'mat']);
    expect(placedBy(sentenceFor(placed))).toEqual(placed);
    expect(placedBy(['a', 'hen', 'in', 'a', 'hut'])).toEqual({
      thing: 'hen',
      how: 'in',
      base: 'hut',
    });
  });

  it.each([
    ['too short', ['a', 'cat', 'sat']],
    ['too long', ['a', 'cat', 'on', 'a', 'mat', 'now']],
    ['without its first little word', ['the', 'cat', 'on', 'a', 'mat']],
    ['without its second', ['a', 'cat', 'on', 'the', 'mat']],
    ['with another word between', ['a', 'cat', 'by', 'a', 'mat']],
    ['about one thing twice', ['a', 'cat', 'on', 'a', 'cat']],
  ])('has no picture for a sentence %s', (_, words) => {
    expect(placedBy(words)).toBeNull();
    expect(sentenceClip(words)).toBeNull();
  });

  it('names the clip a sentence is read aloud in', () => {
    expect(sentenceClip(['a', 'cat', 'on', 'a', 'mat'])).toBe('sentence.cat-on-mat');
    expect(sentenceClip(['a', 'hen', 'in', 'a', 'hut'])).toBe('sentence.hen-in-hut');
  });
});

describe('what a wrong answer says', () => {
  it('of claps: how far off, and which way', () => {
    expect(clapsMisconception(2, 3)).toBe('one-more');
    expect(clapsMisconception(2, 1)).toBe('one-fewer');
    expect(clapsMisconception(1, 3)).toBe('many-more');
    expect(clapsMisconception(3, 1)).toBe('many-fewer');
  });

  it('of a picture: which word of the sentence it gets wrong', () => {
    const right = { thing: 'hat', how: 'on', base: 'cat' } as const;
    expect(placedMisconception(right, { thing: 'cat', how: 'on', base: 'hat' })).toBe(
      'words-swapped',
    );
    expect(placedMisconception(right, { thing: 'hat', how: 'in', base: 'cat' })).toBe(
      'little-word-misread',
    );
    expect(placedMisconception(right, { thing: 'rat', how: 'on', base: 'cat' })).toBe(
      'first-word-misread',
    );
    expect(placedMisconception(right, { thing: 'hat', how: 'on', base: 'cot' })).toBe(
      'last-word-misread',
    );
  });
});
