import { describe, expect, it } from 'vitest';
import { ARRANGEMENTS, type ITEM_KINDS } from '@/engine';
import { describe as describePicture, layout, thingScale } from '@/game/worlds/number-garden';

describe('Number Garden pictures', () => {
  it('places exactly as many things as asked, for every amount and layout', () => {
    for (const arrangement of ARRANGEMENTS) {
      for (let count = 1; count <= 10; count++) {
        expect(layout(count, arrangement)).toHaveLength(count);
      }
    }
  });

  it('keeps things apart, so each one can be seen and counted', () => {
    for (const arrangement of ARRANGEMENTS) {
      for (let count = 2; count <= 10; count++) {
        const places = layout(count, arrangement);
        for (let a = 0; a < places.length; a++) {
          for (let b = a + 1; b < places.length; b++) {
            const [ax, ay] = places[a]!;
            const [bx, by] = places[b]!;
            // A thing is 40 across before scaling; neighbours must not touch.
            expect(Math.hypot(ax - bx, ay - by)).toBeGreaterThan(40 * thingScale(count));
          }
        }
      }
    }
  });

  it('keeps everything inside the picture', () => {
    for (const arrangement of ARRANGEMENTS) {
      for (let count = 1; count <= 10; count++) {
        // The picture box is x 18–182, y 6–126; a thing reaches 20 from its centre before scaling, and its
        // shadow a little further below.
        const reach = 20 * thingScale(count);
        for (const [x, y] of layout(count, arrangement)) {
          expect(x - reach).toBeGreaterThanOrEqual(18);
          expect(x + reach).toBeLessThanOrEqual(182);
          expect(y - reach).toBeGreaterThanOrEqual(6);
          expect(y + reach * 1.25).toBeLessThanOrEqual(126);
        }
      }
    }
  });

  it('lays a row out differently from a cluster, so matching cannot be done by shape', () => {
    for (const count of [2, 3, 4, 5]) {
      expect(layout(count, 'row')).not.toEqual(layout(count, 'cluster'));
    }
  });

  it('draws every set of up to six at the same size, so size is not a clue to the amount', () => {
    const sizes = new Set([1, 2, 3, 4, 5, 6].map(thingScale));
    expect(sizes.size).toBe(1);
  });

  it('is the same every time', () => {
    expect(layout(3, 'cluster')).toEqual(layout(3, 'cluster'));
  });

  it('describes a picture in words for screen readers', () => {
    const say = (item: (typeof ITEM_KINDS)[number], count: number) =>
      describePicture({ type: 'quantity', item, count, arrangement: 'row' });
    expect(say('snail', 1)).toBe('one snail');
    expect(say('leaf', 2)).toBe('two leaves');
    expect(say('acorn', 3)).toBe('three acorns');
    expect(say('apple', 10)).toBe('ten apples');
  });
});
