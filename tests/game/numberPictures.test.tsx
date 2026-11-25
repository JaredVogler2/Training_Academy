// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { numeralWidth } from '@/art/numerals';
import type { Stimulus } from '@/engine';
import numberGarden, {
  describe as describePicture,
  dotPlaces,
  storyPlaces,
} from '@/game/worlds/number-garden';

afterEach(cleanup);

const { Picture } = numberGarden;

const numeral = (value: number): Stimulus => ({ type: 'scene', scene: 'numeral', of: { value } });
const tower = (count: number): Stimulus => ({ type: 'scene', scene: 'tower', of: { count } });
const stairs = (heights: number[]): Stimulus => ({
  type: 'scene',
  scene: 'stairs',
  of: { heights },
});
const frame = (places: number[], empty = false): Stimulus => ({
  type: 'scene',
  scene: 'frame',
  of: { places, item: 'acorn', ...(empty ? { count: 'empty' } : {}) },
});
const path = (from: number, to: number, gap: number): Stimulus => ({
  type: 'scene',
  scene: 'path',
  of: { from, to, gap },
});
const story = (kind: 'join' | 'leave', start: number, change: number): Stimulus => ({
  type: 'scene',
  scene: 'story',
  of: { kind, item: 'frog', start, change },
});

const count = (container: HTMLElement, selector: string) =>
  container.querySelectorAll(selector).length;

describe('a numeral', () => {
  it('is drawn for every number from 0 to 10, and ten is the widest', () => {
    for (let value = 0; value <= 10; value++) {
      const { container, unmount } = render(<Picture stimulus={numeral(value)} />);
      expect(count(container, 'path')).toBe(String(value).length);
      unmount();
    }
    expect(numeralWidth(10)).toBeGreaterThan(numeralWidth(8));
    // Wide as it is, ten fits its card with room either side.
    expect(numeralWidth(10)).toBeLessThan(80 - 16);
  });

  it('shows no dots: it has to be read', () => {
    const { container } = render(<Picture stimulus={numeral(4)} />);
    expect(count(container, '[data-dot]')).toBe(0);
  });

  it('shows its amount in dots while it is being counted, and only then', () => {
    for (let value = 0; value <= 10; value++) {
      const { container, unmount } = render(<Picture stimulus={numeral(value)} counting />);
      expect(count(container, '[data-dot]')).toBe(value);
      unmount();
    }
  });

  it('puts its dots five to a line, apart from each other and inside the card', () => {
    for (let value = 1; value <= 10; value++) {
      const places = dotPlaces(value);
      expect(places).toHaveLength(value);
      expect(new Set(places.map(([, y]) => y)).size).toBe(value > 5 ? 2 : 1);
      for (const [x, y] of places) {
        // The card is 80 wide about its middle, and reaches down to 20; a dot is 3.4 across its half.
        expect(Math.abs(x) + 3.4).toBeLessThan(40);
        expect(y + 3.4).toBeLessThan(20);
        expect(y - 3.4).toBeGreaterThan(2.75);
      }
      places.forEach(([ax, ay], a) => {
        places.slice(a + 1).forEach(([bx, by]) => {
          expect(Math.hypot(ax - bx, ay - by)).toBeGreaterThan(6.8);
        });
      });
    }
    // Six is a full line of five and one under its first: the way a frame of ten holds six.
    expect(
      dotPlaces(6)
        .slice(0, 5)
        .every(([, y]) => y === 8),
    ).toBe(true);
    expect(dotPlaces(6)[5]).toEqual([dotPlaces(6)[0]?.[0], 16]);
  });
});

describe('a tower, and a staircase of towers', () => {
  it('has a block for each one of its amount', () => {
    for (let blocks = 1; blocks <= 6; blocks++) {
      const { container, unmount } = render(<Picture stimulus={tower(blocks)} />);
      expect(count(container, '[data-block]')).toBe(blocks);
      unmount();
    }
  });

  it('stands its blocks one on another without touching, the tallest tower inside the picture', () => {
    const { container } = render(<Picture stimulus={tower(6)} />);
    const tops = [...container.querySelectorAll('[data-block] rect')].map((rect) =>
      Number(rect.getAttribute('y')),
    );
    const high = Number(container.querySelector('[data-block] rect')?.getAttribute('height'));
    tops.slice(1).forEach((top, index) => {
      expect((tops[index] ?? 0) - top).toBeGreaterThan(high);
    });
    expect(Math.min(...tops)).toBeGreaterThan(0);
  });

  it('draws every step but the missing one, and says nothing of how tall that one is', () => {
    const { container } = render(<Picture stimulus={stairs([2, 3, 0, 5])} place="prompt" />);
    expect(count(container, '[data-block]')).toBe(2 + 3 + 5);
    expect(count(container, '[data-gap] [data-block]')).toBe(0);
    expect(count(container, '[data-gap]')).toBe(1);
    // Nothing on the page says what belongs in the gap.
    expect(container.innerHTML).not.toContain('data-heights="2-3-4-5"');
    expect(container.querySelector('svg')?.getAttribute('data-heights')).toBe('2-3-0-5');
  });

  it('stands the missing tower in the gap once it has been found', () => {
    const { container } = render(<Picture stimulus={stairs([2, 3, 0, 5])} solved />);
    expect(count(container, '[data-gap] [data-block]')).toBe(4);
  });

  it('lifts one step at a time while the stairs are sung', () => {
    const { container } = render(<Picture stimulus={stairs([2, 3, 0, 5])} part={1} />);
    const lit = [...container.querySelectorAll('[data-lit="true"]')];
    expect(lit).toHaveLength(1);
    expect(lit[0]?.querySelectorAll('[data-block]')).toHaveLength(3);
  });
});

describe('a frame', () => {
  it('has five places, or ten, and a thing in each full one', () => {
    const five = render(<Picture stimulus={frame([1, 1, 1, 0, 0])} />);
    expect(count(five.container, '[data-full-place]')).toBe(3);
    expect(five.container.querySelector('svg')?.getAttribute('data-places')).toBe('11100');
    five.unmount();
    const ten = render(<Picture stimulus={frame([1, 1, 1, 1, 1, 1, 1, 0, 0, 0])} />);
    expect(count(ten.container, '[data-full-place]')).toBe(7);
  });

  it('can be empty: nothing in it at all', () => {
    const { container } = render(<Picture stimulus={frame(Array<number>(10).fill(0))} />);
    expect(count(container, '[data-full-place]')).toBe(0);
  });

  it('marks its empty places while they are being counted, where the question is how many more', () => {
    const still = render(<Picture stimulus={frame([1, 0, 1, 0, 0], true)} />);
    expect(count(still.container, '[data-empty-place]')).toBe(0);
    still.unmount();
    const counting = render(<Picture stimulus={frame([1, 0, 1, 0, 0], true)} counting />);
    expect(count(counting.container, '[data-empty-place]')).toBe(3);
    counting.unmount();
    // Where it only stands for an amount, there is nothing to mark: the things in it are what is counted.
    const amount = render(<Picture stimulus={frame([1, 0, 1, 0, 0])} counting />);
    expect(count(amount.container, '[data-empty-place]')).toBe(0);
  });

  it('is filled, once the answer has been found, with what the answer brought', () => {
    const { container } = render(<Picture stimulus={frame([1, 0, 1, 0, 0], true)} solved />);
    expect(count(container, '[data-full-place]')).toBe(5);
    expect(count(container, '[data-filled-in]')).toBe(3);
  });
});

describe('a path of numbered stones', () => {
  it('writes every number but the missing one, and does not say what that is', () => {
    const { container } = render(<Picture stimulus={path(3, 7, 5)} place="prompt" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('data-numbers')).toBe('3-4-x-6-7');
    // A numeral is one stroke for each digit: four stones have one, and the bare stone has none.
    expect(count(container, 'g > g > path')).toBe(4);
    expect(count(container, '[data-gap] g > path')).toBe(0);
  });

  it('writes the missing number on its stone once it has been found', () => {
    const { container } = render(<Picture stimulus={path(3, 7, 5)} solved />);
    expect(count(container, '[data-gap] g > path')).toBe(1);
  });

  it('has room for ten on a stone', () => {
    const { container } = render(<Picture stimulus={path(7, 10, 8)} />);
    // Two strokes for 10, one each for 7 and 9.
    expect(count(container, 'g > g > path')).toBe(4);
    // A stone is 35 across; ten, at the size it is written there, is narrower.
    expect(numeralWidth(10) * 0.58).toBeLessThan(35 - 6);
  });
});

describe('a story', () => {
  it('in which some come shows those who were there, and apart from them those who came', () => {
    const { container } = render(<Picture stimulus={story('join', 3, 2)} />);
    expect(count(container, '[data-staying] [data-thing]')).toBe(3);
    expect(count(container, '[data-moving] [data-thing]')).toBe(2);
    // Everyone is counted: how many now?
    expect(count(container, '[data-counted]')).toBe(5);
  });

  it('in which some go shows those who are left, and apart from them those who went, who are not counted', () => {
    const { container } = render(<Picture stimulus={story('leave', 5, 2)} />);
    expect(count(container, '[data-staying] [data-thing]')).toBe(3);
    expect(count(container, '[data-moving] [data-thing]')).toBe(2);
    expect(count(container, '[data-counted]')).toBe(3);
  });

  it('can leave nobody', () => {
    const { container } = render(<Picture stimulus={story('leave', 3, 3)} />);
    expect(count(container, '[data-staying] [data-thing]')).toBe(0);
    expect(count(container, '[data-counted]')).toBe(0);
  });

  it('is shown as it stood before anyone moved for the first part of its telling, and then as it is', () => {
    const before = render(<Picture stimulus={story('join', 3, 2)} part={0} />);
    expect(before.container.querySelector('[data-moving]')?.getAttribute('data-told')).toBe(
      'before',
    );
    before.unmount();
    const after = render(<Picture stimulus={story('join', 3, 2)} part={1} />);
    expect(after.container.querySelector('[data-moving]')?.getAttribute('data-told')).toBe('after');
    after.unmount();
    const still = render(<Picture stimulus={story('join', 3, 2)} />);
    expect(still.container.querySelector('[data-moving]')?.getAttribute('data-told')).toBe('after');
  });

  it('keeps everyone apart and inside the picture, however many there are, and never too small to count', () => {
    for (let staying = 0; staying <= 9; staying++) {
      for (let moving = 1; staying + moving <= 10; moving++) {
        const { stay, move, box } = storyPlaces(staying, moving);
        expect(stay).toHaveLength(staying);
        expect(move).toHaveLength(moving);
        const all = [...stay, ...move];
        // A thing is 30 across as it is drawn here, hops a little way up while it is counted, and has a shadow
        // a little way under it.
        for (const [x, y] of all) {
          expect(x - 15).toBeGreaterThanOrEqual(box.x);
          expect(x + 15).toBeLessThanOrEqual(box.x + box.width);
          expect(y - 15 - 9).toBeGreaterThanOrEqual(box.y);
          expect(y + 19).toBeLessThanOrEqual(box.y + box.height);
        }
        all.forEach(([ax, ay], a) => {
          all.slice(a + 1).forEach(([bx, by]) => {
            expect(Math.hypot(ax - bx, ay - by)).toBeGreaterThan(30);
          });
        });
        // Those on the move stand clear of those who stay: more than a thing's width of air between them.
        for (const [sx] of stay) {
          for (const [mx] of move) expect(mx - sx).toBeGreaterThan(30 * 2);
        }
        // The picture is never so wide that, on the narrowest phone there is (some 280 pixels of picture),
        // a thing in it would be drawn smaller than 30 pixels across.
        expect(box.width).toBeLessThanOrEqual(280);
      }
    }
  });

  it('is cut to who is in it, so that a story of two is drawn large', () => {
    const small = storyPlaces(1, 1).box;
    const large = storyPlaces(5, 5).box;
    expect(small.width).toBeLessThan(large.width / 2 + 20);
    expect(small.height).toBeLessThan(large.height);
  });
});

describe('a number to listen to', () => {
  it('is a button where it is what is asked about: tapping it asks to hear it again', () => {
    const again = vi.fn();
    const { getByRole } = render(
      <Picture stimulus={{ type: 'sound', clip: 'count.7' }} place="prompt" onAgain={again} />,
    );
    fireEvent.click(getByRole('button', { name: 'Hear it again' }));
    expect(again).toHaveBeenCalledTimes(1);
  });

  it('does not say on the page which number it is', () => {
    const { container } = render(
      <Picture stimulus={{ type: 'sound', clip: 'count.7' }} place="prompt" onAgain={() => {}} />,
    );
    expect(container.textContent).toBe('');
  });
});

describe('in words, for someone who cannot see them', () => {
  it.each([
    [numeral(7), 'The number 7'],
    [tower(1), 'A tower of one block'],
    [tower(4), 'A tower of four blocks'],
    [stairs([1, 2, 0, 4]), 'Towers in a row: one high, two high, one missing and four high'],
    [frame([1, 1, 1, 0, 0]), 'A frame with five places, holding three acorns'],
    [
      frame([1, 1, 1, 0, 0], true),
      'A frame with five places, holding three acorns. Some places are empty',
    ],
    [frame(Array<number>(10).fill(0)), 'A frame with ten places, holding no acorns'],
    [path(3, 6, 5), 'Stones in a row, numbered 3, 4, a bare stone and 6'],
    [story('join', 3, 2), 'three frogs, and two more come'],
    [story('join', 1, 1), 'one frog, and one more comes'],
    [story('leave', 5, 1), 'five frogs, and one goes away'],
    [{ type: 'sound', clip: 'count.7' } satisfies Stimulus, 'A number to listen to'],
  ])('%j', (stimulus, words) => {
    expect(describePicture(stimulus)).toBe(words);
  });

  it('still says what a group and a sign are, as before', () => {
    expect(describePicture({ type: 'quantity', item: 'snail', count: 3, arrangement: 'row' })).toBe(
      'three snails',
    );
    expect(describePicture({ type: 'sign', id: 'more' })).toBe('Which has more?');
  });

  it('never says what is missing, or what was said', () => {
    expect(describePicture(stairs([1, 2, 0, 4]))).not.toMatch(/three/);
    expect(describePicture(path(3, 6, 5))).not.toMatch(/5/);
    expect(describePicture({ type: 'sound', clip: 'count.7' })).not.toMatch(/7|seven/);
  });
});
