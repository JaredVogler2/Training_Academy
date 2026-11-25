import { describe, expect, it } from 'vitest';
import {
  amountOf,
  amountShown,
  countableIn,
  numberClip,
  numberMisconception,
  readNumberPicture,
  type NumberPicture,
  type Stimulus,
} from '@/engine';

const scene = (name: string, of: Record<string, string | number | boolean | (string | number)[]>) =>
  ({ type: 'scene', scene: name, of }) satisfies Stimulus;

const read = (stimulus: Stimulus): NumberPicture => {
  const picture = readNumberPicture(stimulus);
  if (!picture) throw new Error('That is not a number picture.');
  return picture;
};

describe('reading a number picture', () => {
  it('reads a group of things, and what it stands for is how many there are', () => {
    const group = read({ type: 'quantity', item: 'frog', count: 4, arrangement: 'row' });
    expect(group).toEqual({ kind: 'group', item: 'frog', count: 4 });
    expect(amountOf(group)).toBe(4);
  });

  it('reads the numerals from 0 to 10, and no others', () => {
    for (let value = 0; value <= 10; value++) {
      expect(amountShown(scene('numeral', { value }))).toBe(value);
    }
    for (const value of [-1, 11, 2.5, '3']) {
      expect(readNumberPicture(scene('numeral', { value }))).toBeNull();
    }
  });

  it('reads a number that is said, by the clip that says it', () => {
    expect(read({ type: 'sound', clip: 'count.7' })).toEqual({ kind: 'spoken', value: 7 });
    expect(read({ type: 'sound', clip: 'count.0' })).toEqual({ kind: 'spoken', value: 0 });
    expect(readNumberPicture({ type: 'sound', clip: 'count.11' })).toBeNull();
    expect(readNumberPicture({ type: 'sound', clip: 'word.sun' })).toBeNull();
    expect(numberClip(3)).toBe('count.3');
  });

  it('reads a tower of one to six blocks', () => {
    expect(amountShown(scene('tower', { count: 6 }))).toBe(6);
    expect(readNumberPicture(scene('tower', { count: 0 }))).toBeNull();
    expect(readNumberPicture(scene('tower', { count: 7 }))).toBeNull();
  });

  it('is nothing for a picture another world draws', () => {
    expect(readNumberPicture({ type: 'picture', id: 'sun' })).toBeNull();
    expect(readNumberPicture({ type: 'sign', id: 'more' })).toBeNull();
    expect(readNumberPicture(scene('map', { place: 'harbour' }))).toBeNull();
    expect(amountShown(undefined)).toBeNull();
  });
});

describe('a staircase with a step missing', () => {
  it('fills the missing step in from its neighbours, going up', () => {
    const stairs = read(scene('stairs', { heights: [1, 2, 0, 4] }));
    expect(stairs).toEqual({ kind: 'stairs', heights: [1, 2, 3, 4], gap: 2, step: 1 });
    expect(amountOf(stairs)).toBe(3);
  });

  it('and going down', () => {
    const stairs = read(scene('stairs', { heights: [6, 0, 4, 3] }));
    expect(stairs).toEqual({ kind: 'stairs', heights: [6, 5, 4, 3], gap: 1, step: -1 });
    expect(amountOf(stairs)).toBe(5);
  });

  it('wherever the missing step is: first, in between, or last', () => {
    expect(amountShown(scene('stairs', { heights: [0, 2, 3] }))).toBe(1);
    expect(amountShown(scene('stairs', { heights: [2, 0, 4] }))).toBe(3);
    expect(amountShown(scene('stairs', { heights: [2, 3, 0] }))).toBe(4);
    expect(amountShown(scene('stairs', { heights: [0, 4, 3, 2] }))).toBe(5);
  });

  it.each([
    ['no step missing', [1, 2, 3]],
    ['two steps missing', [1, 0, 0, 4]],
    ['steps that go up by two', [1, 3, 0]],
    ['steps that go up and then down', [1, 2, 0, 2, 1]],
    ['steps that do not agree with each other', [1, 2, 0, 5]],
    ['a missing step that would be no blocks at all', [0, 1, 2]],
    ['a missing step that would be taller than there is room for', [4, 5, 6, 0]],
    ['too few steps', [1, 0]],
    ['too many steps', [0, 2, 3, 4, 5, 6]],
    ['steps that are not whole numbers', [1, 2.5, 0]],
  ])('refuses %s', (_, heights) => {
    expect(readNumberPicture(scene('stairs', { heights }))).toBeNull();
  });
});

describe('a frame of five, or of ten', () => {
  it('stands for how many it holds', () => {
    const frame = read(scene('frame', { places: [1, 1, 1, 0, 0], item: 'acorn' }));
    expect(frame).toMatchObject({ kind: 'frame', item: 'acorn', filled: 3, asks: 'filled' });
    expect(amountOf(frame)).toBe(3);
    expect(countableIn(frame)).toBe(3);
  });

  it('or, where it asks how many more would fill it, for its empty places', () => {
    const frame = read(scene('frame', { places: [1, 0, 1, 0, 1], item: 'acorn', count: 'empty' }));
    expect(frame).toMatchObject({ filled: 3, asks: 'empty' });
    expect(amountOf(frame)).toBe(2);
    expect(countableIn(frame)).toBe(2);
  });

  it('can be empty: that is zero', () => {
    expect(amountShown(scene('frame', { places: Array(10).fill(0), item: 'leaf' }))).toBe(0);
  });

  it('has ten places in two lines of five', () => {
    const places = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0];
    expect(amountShown(scene('frame', { places, item: 'snail' }))).toBe(7);
    expect(amountShown(scene('frame', { places, item: 'snail', count: 'empty' }))).toBe(3);
  });

  it.each([
    ['a frame of some other size', { places: [1, 1, 0, 0], item: 'acorn' }],
    ['a place that is neither full nor empty', { places: [1, 2, 0, 0, 0], item: 'acorn' }],
    ['a thing nobody can draw', { places: [1, 1, 0, 0, 0], item: 'dragon' }],
    ['a question nobody can ask of it', { places: [1, 1, 0, 0, 0], item: 'acorn', count: 'full' }],
  ])('refuses %s', (_, of) => {
    expect(readNumberPicture(scene('frame', of))).toBeNull();
  });
});

describe('a path of numbered stones', () => {
  it('counts on from one number to another, with one stone bare', () => {
    const path = read(scene('path', { from: 3, to: 7, gap: 5 }));
    expect(path).toEqual({ kind: 'path', numbers: [3, 4, 5, 6, 7], gap: 2, step: 1 });
    expect(amountOf(path)).toBe(5);
  });

  it('or counts back', () => {
    const path = read(scene('path', { from: 5, to: 2, gap: 2 }));
    expect(path).toEqual({ kind: 'path', numbers: [5, 4, 3, 2], gap: 3, step: -1 });
  });

  it('can start at zero, and zero can be the stone that is bare', () => {
    expect(amountShown(scene('path', { from: 0, to: 3, gap: 0 }))).toBe(0);
  });

  it.each([
    ['a bare stone that is not on the path', { from: 3, to: 6, gap: 7 }],
    ['a path of two stones', { from: 3, to: 4, gap: 4 }],
    ['a path of six stones', { from: 1, to: 6, gap: 4 }],
    ['a path that goes nowhere', { from: 4, to: 4, gap: 4 }],
    ['a path that goes past ten', { from: 8, to: 11, gap: 9 }],
  ])('refuses %s', (_, of) => {
    expect(readNumberPicture(scene('path', of))).toBeNull();
  });
});

describe('a story', () => {
  it('in which some more come stands for how many there are then', () => {
    const story = read(scene('story', { kind: 'join', item: 'bird', start: 3, change: 2 }));
    expect(story).toEqual({
      kind: 'story',
      change: 'join',
      item: 'bird',
      start: 3,
      moved: 2,
      result: 5,
    });
    expect(amountOf(story)).toBe(5);
    expect(countableIn(story)).toBe(5);
  });

  it('in which some go away stands for how many are left', () => {
    const story = read(scene('story', { kind: 'leave', item: 'frog', start: 5, change: 2 }));
    expect(amountOf(story)).toBe(3);
    expect(countableIn(story)).toBe(3);
  });

  it('can leave none at all', () => {
    expect(amountShown(scene('story', { kind: 'leave', item: 'frog', start: 3, change: 3 }))).toBe(
      0,
    );
  });

  it.each([
    ['more going than were there', { kind: 'leave', item: 'frog', start: 2, change: 3 }],
    ['more than ten in the end', { kind: 'join', item: 'frog', start: 7, change: 4 }],
    ['nobody there to begin with', { kind: 'join', item: 'frog', start: 0, change: 2 }],
    ['nobody moving', { kind: 'join', item: 'frog', start: 2, change: 0 }],
    ['something that neither comes nor goes', { kind: 'swap', item: 'frog', start: 2, change: 1 }],
  ])('refuses %s', (_, of) => {
    expect(readNumberPicture(scene('story', of))).toBeNull();
  });
});

describe('what there is to count, one by one', () => {
  it('is the dots of a numeral, the blocks of a tower, the things of a group', () => {
    expect(countableIn(read(scene('numeral', { value: 4 })))).toBe(4);
    expect(countableIn(read(scene('numeral', { value: 0 })))).toBe(0);
    expect(countableIn(read(scene('tower', { count: 5 })))).toBe(5);
  });

  it('is nothing for a staircase, a path or a number that is said: those are sung, walked and heard', () => {
    expect(countableIn(read(scene('stairs', { heights: [1, 2, 0] })))).toBe(0);
    expect(countableIn(read(scene('path', { from: 1, to: 3, gap: 2 })))).toBe(0);
    expect(countableIn(read({ type: 'sound', clip: 'count.9' }))).toBe(0);
  });
});

describe('why a wrong number is tempting', () => {
  const numeral = read(scene('numeral', { value: 5 }));

  it('is named by how far off it is', () => {
    expect(numberMisconception(numeral, 6)).toBe('one-more');
    expect(numberMisconception(numeral, 4)).toBe('one-fewer');
    expect(numberMisconception(numeral, 9)).toBe('many-more');
    expect(numberMisconception(numeral, 1)).toBe('many-fewer');
  });

  it('is the numeral that looks like the right one, where the choices are numerals', () => {
    const six = read(scene('frame', { places: [1, 1, 1, 1, 1, 1, 0, 0, 0, 0], item: 'acorn' }));
    expect(numberMisconception(six, 9, true)).toBe('looks-alike');
    expect(numberMisconception(six, 9, false)).toBe('many-more');
    const nine = read({ type: 'sound', clip: 'count.9' });
    expect(numberMisconception(nine, 6, true)).toBe('looks-alike');
  });

  it('in a story, is counting only those who were there first, or only those who moved', () => {
    const join = read(scene('story', { kind: 'join', item: 'bird', start: 3, change: 2 }));
    expect(numberMisconception(join, 3)).toBe('counted-what-was-there-first');
    expect(numberMisconception(join, 2)).toBe('counted-those-that-came');
    expect(numberMisconception(join, 4)).toBe('one-fewer');
    const leave = read(scene('story', { kind: 'leave', item: 'bird', start: 5, change: 1 }));
    expect(numberMisconception(leave, 5)).toBe('counted-what-was-there-first');
    expect(numberMisconception(leave, 1)).toBe('counted-those-that-left');
  });

  it('in a frame to be filled, is counting the places that are already full', () => {
    const frame = read(scene('frame', { places: [1, 1, 1, 1, 0], item: 'leaf', count: 'empty' }));
    expect(numberMisconception(frame, 4)).toBe('counted-the-full-places');
    expect(numberMisconception(frame, 2)).toBe('one-more');
  });
});
