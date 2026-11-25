// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import readingCovePack from '@/content/packs/reading-cove.v2.json';
import { lettersWidth } from '@/art/letters';
import { parseContentPack, readReadingPicture, type Stimulus } from '@/engine';
import readingCove, { describe as describePicture } from '@/game/worlds/reading-cove';
import { Sentence, canPlace, placing, wordPlaces } from '@/game/worlds/reading-cove/scenes';

afterEach(cleanup);

/**
 * The pictures Reading Cove draws for its later questions. What matters about each is what a child can and cannot
 * read off it: no clap before it is clapped, no finger under a sentence that is theirs to read, and for every
 * sentence a picture of exactly what it says.
 */

const { Picture } = readingCove;
const parsed = parseContentPack(readingCovePack);
if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
const pack = parsed.value;

const rhyme = (word: string): Stimulus => ({ type: 'scene', scene: 'rhyme', of: { word } });
const beats = (word: string): Stimulus => ({ type: 'scene', scene: 'beats', of: { word } });
const claps = (count: number): Stimulus => ({ type: 'scene', scene: 'claps', of: { count } });
const sentence = (text: string): Stimulus => ({
  type: 'scene',
  scene: 'sentence',
  of: { words: text.split(' ') },
});
const placed = (text: string): Stimulus => {
  const [thing = '', how = '', base = ''] = text.split(' ');
  return { type: 'scene', scene: 'placed', of: { thing, how, base } };
};
const count = (container: HTMLElement, selector: string) =>
  container.querySelectorAll(selector).length;

/** Every stimulus of the pack that is asked with or answered with. */
function everyStimulus(): Stimulus[] {
  return pack.lessons.flatMap((lesson) =>
    lesson.challenges.flatMap((challenge) =>
      challenge.kind === 'choose-one'
        ? [challenge.prompt.stimulus, ...challenge.choices.map((choice) => choice.stimulus)]
        : [
            ...(challenge.prompt.stimulus ? [challenge.prompt.stimulus] : []),
            ...('cards' in challenge.task ? challenge.task.cards.map((card) => card.stimulus) : []),
          ],
    ),
  );
}

describe('a word to find a rhyme for', () => {
  it('is its picture, with the end of the word marked under it', () => {
    const { container } = render(<Picture stimulus={rhyme('cat')} place="prompt" />);
    expect(container.querySelector('[data-rhyme-with="cat"]')).not.toBeNull();
    // The drawing of the cat, and under it a line in two parts.
    expect(count(container, '[data-rhyme-with="cat"] circle')).toBeGreaterThan(0);
    const lines = [...container.querySelectorAll('[data-rhyme-with="cat"] > path')].filter((path) =>
      path.getAttribute('d')?.includes('41'),
    );
    expect(lines).toHaveLength(2);
  });
});

describe('a word to clap', () => {
  const clapped = (container: HTMLElement) => count(container, '[data-clap]');

  it('shows no clap at all until one is clapped', () => {
    const { container } = render(<Picture stimulus={beats('elephant')} place="prompt" />);
    expect(clapped(container)).toBe(0);
    expect(container.querySelector('[data-clap-word]')?.getAttribute('data-clapped')).toBe('0');
  });

  it('is not marked for a word that is only named: the claps come with the beats', () => {
    const { container } = render(<Picture stimulus={beats('elephant')} place="prompt" sounding />);
    expect(clapped(container)).toBe(0);
  });

  it('gains one clap with each beat, and never one it has not had', () => {
    for (const [part, shown] of [
      [0, 1],
      [1, 2],
      [2, 3],
    ] as const) {
      const { container, unmount } = render(
        <Picture stimulus={beats('elephant')} place="prompt" sounding part={part} />,
      );
      expect(clapped(container)).toBe(shown);
      // The one that has just been clapped is the one that pops.
      expect(container.querySelector('[data-now="true"]')?.getAttribute('data-clap')).toBe(
        String(part),
      );
      unmount();
    }
  });

  it('starts every row of claps in the same place, so that where the first one is says nothing', () => {
    const firstOf = (word: string) => {
      const { container, unmount } = render(
        <Picture stimulus={beats(word)} place="prompt" sounding part={0} />,
      );
      const at = container.querySelector('[data-clap="0"] > g')?.getAttribute('transform');
      unmount();
      return at;
    };
    expect(firstOf('sun')).toBe(firstOf('elephant'));
    expect(firstOf('apple')).toBe(firstOf('elephant'));
  });

  it('shows them all once the question has been answered, and no more than the word has', () => {
    for (const [word, beatsIn] of [
      ['sun', 1],
      ['apple', 2],
      ['elephant', 3],
    ] as const) {
      const { container, unmount } = render(
        <Picture stimulus={beats(word)} place="prompt" solved />,
      );
      expect(clapped(container), word).toBe(beatsIn);
      unmount();
    }
    // A beat past the end of the word is not a clap.
    const { container } = render(
      <Picture stimulus={beats('apple')} place="prompt" sounding part={5} />,
    );
    expect(clapped(container)).toBe(2);
  });
});

describe('a card of claps', () => {
  it('has as many claps as it says', () => {
    for (const each of [1, 2, 3]) {
      const { container, unmount } = render(<Picture stimulus={claps(each)} place="choice" />);
      expect(count(container, '[data-clap]')).toBe(each);
      expect(container.querySelector('[data-claps]')?.getAttribute('data-claps')).toBe(
        String(each),
      );
      unmount();
    }
  });

  it('claps them one after another while it is played: each a little later than the last', () => {
    const { container } = render(<Picture stimulus={claps(3)} place="choice" sounding />);
    const delays = [...container.querySelectorAll<SVGGElement>('[data-clap]')].map((clap) =>
      Number.parseInt(clap.style.animationDelay, 10),
    );
    expect(delays[0]).toBe(0);
    expect(delays[1]).toBeGreaterThan(0);
    expect(delays[2]).toBe(2 * (delays[1] ?? 0));
  });

  it('draws nothing for a number of claps there is no card for', () => {
    const { container } = render(<Picture stimulus={claps(4)} place="choice" />);
    expect(count(container, 'svg')).toBe(0);
  });
});

describe('a sentence in print', () => {
  it('is its words in order on one line, all drawn in one picture and so at one size', () => {
    const { container } = render(<Picture stimulus={sentence('a cat on a mat')} place="prompt" />);
    expect(count(container, 'svg')).toBe(1);
    const tokens = [...container.querySelectorAll('[data-token]')];
    expect(tokens).toHaveLength(5);
    // Left to right, each further along than the last.
    const along = tokens.map((token) =>
      Number(/translate\(([-\d.]+)/.exec(token.getAttribute('transform') ?? '')?.[1]),
    );
    expect([...along].sort((a, b) => a - b)).toEqual(along);
    // "cat" is three letters: three strokes' worth of letters in its group.
    expect(tokens[1]?.querySelectorAll('path').length).toBe(3);
  });

  it('keeps its words apart: no word reaches into the next', () => {
    const words = 'a cat on a mat'.split(' ');
    const { places, width } = wordPlaces(words);
    for (const [index, place] of places.entries()) {
      const next = places[index + 1];
      expect(place.width).toBe(lettersWidth(words[index] ?? ''));
      if (next) {
        const gap = next.middle - next.width / 2 - (place.middle + place.width / 2);
        // More room between words than there is inside the widest letter.
        expect(gap).toBeGreaterThanOrEqual(20);
      }
    }
    const last = places.at(-1);
    expect(width).toBeCloseTo((last?.middle ?? 0) + (last?.width ?? 0) / 2);
  });

  it('has no finger under it when it is not being read aloud: the reading is the child’s', () => {
    const { container } = render(<Picture stimulus={sentence('a cat on a mat')} place="prompt" />);
    expect(count(container, '[data-finger]')).toBe(0);
    expect(count(container, '[data-read="true"]')).toBe(0);
  });

  it('has the finger under the word that is being read, and only that one', () => {
    for (const part of [0, 2, 4]) {
      const { container, unmount } = render(
        <Picture stimulus={sentence('a cat on a mat')} place="prompt" sounding part={part} />,
      );
      const fingers = [...container.querySelectorAll('[data-finger]')];
      expect(fingers.map((finger) => finger.getAttribute('data-finger'))).toEqual([String(part)]);
      expect(container.querySelector('[data-read="true"]')?.getAttribute('data-token')).toBe(
        String(part),
      );
      unmount();
    }
  });

  it('on two lines has its first two words above and the rest below, both lines starting at one place', () => {
    const words = 'a cat on a mat'.split(' ');
    const { places, width, height } = wordPlaces(words, 2);
    expect(places.map((place) => place.line)).toEqual([0, 0, 1, 1, 1]);
    // Each line starts where the other does.
    const starts = [places[0], places[2]].map(
      (place) => (place?.middle ?? 0) - (place?.width ?? 0) / 2,
    );
    expect(starts).toEqual([0, 0]);
    // It is as wide as its longer line, which is a good deal less than the one line was, and twice as tall.
    const one = wordPlaces(words);
    const lower = places.at(-1);
    expect(width).toBeCloseTo((lower?.middle ?? 0) + (lower?.width ?? 0) / 2);
    expect(width).toBeLessThan(one.width * 0.65);
    expect(height).toBeGreaterThan(one.height * 1.8);
    expect(one.places.every((place) => place.line === 0)).toBe(true);
  });

  it('drawn on two lines, keeps its words in order and stands the finger under the word on its own line', () => {
    const words = 'a hen in a hut'.split(' ');
    const { container } = render(<Sentence words={words} part={3} lines={2} />);
    expect(container.querySelector('[data-sentence]')?.getAttribute('data-lines')).toBe('2');
    const tokens = [...container.querySelectorAll('[data-token]')];
    expect(tokens.map((token) => token.getAttribute('data-line'))).toEqual([
      '0',
      '0',
      '1',
      '1',
      '1',
    ]);
    const lineOf = (element: Element | null) =>
      Number(/translate\([-\d.]+ ([-\d.]+)\)/.exec(element?.getAttribute('transform') ?? '')?.[1]);
    expect(lineOf(tokens[3] ?? null)).toBeGreaterThan(lineOf(tokens[0] ?? null) + 60);
    // The finger is under the fourth word, on the lower line: below that line's letters, not the upper one's.
    const finger = container.querySelector('[data-finger="3"]');
    const fingerAt = Number(/M[-\d.]+ ([-\d.]+)h/.exec(finger?.getAttribute('d') ?? '')?.[1]);
    expect(fingerAt).toBeGreaterThan(lineOf(tokens[3] ?? null));
    expect(fingerAt - lineOf(tokens[3] ?? null)).toBe(30);
  });

  it('is on one line unless the screen is a phone held upright', () => {
    // Nothing here says it is one, so it is not.
    const { container } = render(<Picture stimulus={sentence('a cat on a mat')} place="prompt" />);
    expect(container.querySelector('[data-sentence]')?.getAttribute('data-lines')).toBe('1');
  });

  it('on the small card that stands for the activity, is its first two words only', () => {
    const { container } = render(<Picture stimulus={sentence('a cat on a mat')} place="card" />);
    expect(count(container, '[data-token]')).toBe(2);
    expect(container.querySelector('[data-sentence]')?.getAttribute('data-sentence')).toBe('a cat');
    // Where it is asked about, and anywhere else, it is whole.
    const asked = render(<Picture stimulus={sentence('a cat on a mat')} place="prompt" />);
    expect(count(asked.container, '[data-token]')).toBe(5);
  });

  it('has no finger when the picture is only lifted, or for a word past its end', () => {
    const lifted = render(
      <Picture stimulus={sentence('a cat on a mat')} place="prompt" sounding />,
    );
    expect(count(lifted.container, '[data-finger]')).toBe(0);
    lifted.unmount();
    const past = render(
      <Picture stimulus={sentence('a cat on a mat')} place="prompt" sounding part={9} />,
    );
    expect(count(past.container, '[data-finger]')).toBe(0);
  });
});

describe('one thing on another, or in it', () => {
  const told = everyStimulus().flatMap((stimulus) => {
    const scene = readReadingPicture(stimulus);
    return scene?.kind === 'placed' ? [scene] : [];
  });
  const different = [...new Map(told.map((each) => [JSON.stringify(each), each])).values()];

  it('can be drawn for every pair the sentences use: twenty-nine of them', () => {
    for (const { thing, how, base } of different) {
      expect(canPlace(thing, how, base), `${thing} ${how} ${base}`).toBe(true);
    }
    expect(different).toHaveLength(29);
  });

  it('draws both things, the one underneath whole and at its usual size', () => {
    for (const { thing, how, base } of different) {
      const { container, unmount } = render(
        <Picture stimulus={placed(`${thing} ${how} ${base}`)} place="choice" />,
      );
      const name = `${thing} ${how} ${base}`;
      expect(container.querySelector(`[data-base="${base}"]`), name).not.toBeNull();
      expect(container.querySelector(`[data-thing="${thing}"]`), name).not.toBeNull();
      expect(
        container.querySelector(`[data-base="${base}"]`)?.getAttribute('transform'),
      ).toBeNull();
      expect(container.querySelector('[data-placed]')?.getAttribute('data-placed')).toBe(
        `a ${thing} ${how} a ${base}`,
      );
      unmount();
    }
  });

  it('draws the other one smaller, and all of it inside the picture', () => {
    for (const { thing, how, base } of different) {
      const where = placing(thing, how, base);
      const name = `${thing} ${how} ${base}`;
      if (!where) throw new Error(name);
      expect(where.scale, name).toBeLessThan(0.7);
      expect(where.scale, name).toBeGreaterThan(0.4);
      const [left, top, right, bottom] = where.box;
      // The picture is never smaller than the square the thing underneath is drawn in.
      expect(left, name).toBeLessThanOrEqual(-34);
      expect(right, name).toBeGreaterThanOrEqual(34);
      expect(top, name).toBeLessThanOrEqual(-34);
      expect(bottom, name).toBe(34);
      // And never so tall that the thing underneath is drawn at less than two thirds of its usual size.
      expect(bottom - top, name).toBeLessThanOrEqual(68 * 1.5);
    }
  });

  it('puts a thing that is on another higher up than the same thing in it', () => {
    const on = placing('hen', 'on', 'hut');
    const inside = placing('hen', 'in', 'hut');
    expect(on?.move[1]).toBeLessThan((inside?.move[1] ?? 0) - 20);
  });

  it('hides the foot of a thing that stands in a cup behind the near side of the cup', () => {
    const { container } = render(<Picture stimulus={placed('pen in cup')} place="choice" />);
    const clip = container.querySelector('clipPath');
    expect(clip).not.toBeNull();
    const clipped = container.querySelector('[data-thing="pen"]')?.parentElement;
    expect(clipped?.getAttribute('clip-path')).toBe(`url(#${clip?.id ?? ''})`);
    // A thing on a mat is hidden by nothing.
    const whole = render(<Picture stimulus={placed('cat on mat')} place="choice" />);
    expect(count(whole.container, 'clipPath')).toBe(0);
  });

  it('gives two pictures on one page clips of their own', () => {
    const { container } = render(
      <>
        <Picture stimulus={placed('pen in cup')} place="choice" />
        <Picture stimulus={placed('pin in cup')} place="choice" />
      </>,
    );
    const ids = [...container.querySelectorAll('clipPath')].map((clip) => clip.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('draws nothing for a pair there is no way to put together', () => {
    expect(canPlace('cat', 'in', 'mat')).toBe(false);
    expect(canPlace('moon', 'on', 'mat')).toBe(false);
    expect(canPlace('cat', 'on', 'zebra')).toBe(false);
    const { container } = render(<Picture stimulus={placed('cat in mat')} place="choice" />);
    expect(count(container, 'svg')).toBe(0);
  });
});

describe('a word in letters', () => {
  const word = (id: string): Stimulus => ({ type: 'word', id });

  it('has one tile for each sound: two letters that write one sound share a tile', () => {
    const { container } = render(<Picture stimulus={word('ship')} place="prompt" />);
    const tiles = [...container.querySelectorAll('[data-word="ship"] [data-letters]')];
    expect(tiles.map((tile) => tile.getAttribute('data-letters'))).toEqual(['sh', 'i', 'p']);
    // The pair is drawn as its two letters.
    expect(tiles[0]?.querySelectorAll('path').length).toBe(2);
  });

  it('lifts the tile of the sound that is being said, and stands the finger under it', () => {
    const { container } = render(
      <Picture stimulus={word('fish')} place="prompt" sounding part={2} />,
    );
    const shown = container.querySelector<HTMLElement>('[data-word="fish"]');
    expect(shown?.getAttribute('data-at')).toBe('2');
    expect(shown?.style.getPropertyValue('--at')).toBe('2');
    expect(shown?.style.getPropertyValue('--of')).toBe('3');
    const now = [...container.querySelectorAll('[data-now="true"] [data-letters]')];
    expect(now.map((tile) => tile.getAttribute('data-letters'))).toEqual(['sh']);
  });

  it('lifts no one tile when the word is said without its sounds being followed', () => {
    const { container } = render(<Picture stimulus={word('fish')} place="prompt" sounding />);
    expect(container.querySelector('[data-word="fish"]')?.hasAttribute('data-at')).toBe(false);
    expect(count(container, '[data-now="true"]')).toBe(0);
  });
});

describe('every picture of the pack', () => {
  it('is drawn: nothing a child is asked about or offered comes out empty', () => {
    for (const stimulus of everyStimulus()) {
      const { container, unmount } = render(<Picture stimulus={stimulus} place="choice" />);
      expect(count(container, 'svg'), JSON.stringify(stimulus)).toBeGreaterThan(0);
      unmount();
    }
  });

  it('has words for a screen reader, and a sentence is spelt for one, not read out', () => {
    for (const stimulus of everyStimulus()) {
      expect(describePicture(stimulus).length, JSON.stringify(stimulus)).toBeGreaterThan(0);
    }
    expect(describePicture(rhyme('cat'))).toBe('A word to find a rhyme for: cat');
    expect(describePicture(beats('elephant'))).toBe('A word to clap: elephant');
    expect(describePicture(claps(1))).toBe('one clap');
    expect(describePicture(claps(3))).toBe('three claps');
    expect(describePicture(placed('hen in hut'))).toBe('A picture: a hen in a hut');
    expect(describePicture(sentence('a cat on a mat'))).toBe(
      'A sentence to read: a; c, a, t; o, n; a; m, a, t',
    );
    // One that is not well made says nothing, as it shows nothing.
    expect(describePicture(claps(9))).toBe('');
  });
});
