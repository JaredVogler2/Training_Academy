import { describe, expect, it } from 'vitest';
import { createRng, hashString, rngFor } from '@/engine';

describe('seeded randomness', () => {
  it('produces the same stream for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(
      Array.from({ length: 20 }, () => b.next()),
    );
  });

  it('produces different streams for different seeds', () => {
    const a = Array.from({ length: 8 }, createRng(1).next);
    const b = Array.from({ length: 8 }, createRng(2).next);
    expect(a).not.toEqual(b);
  });

  it('stays inside [0, 1) and int() inside its range', () => {
    const rng = createRng(123456);
    for (let index = 0; index < 5000; index++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      const int = rng.int(7);
      expect(Number.isInteger(int)).toBe(true);
      expect(int).toBeGreaterThanOrEqual(0);
      expect(int).toBeLessThan(7);
    }
  });

  it('shuffles without losing, repeating or mutating', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    const shuffled = createRng(9).shuffle(items);
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect([...shuffled].sort()).toEqual(items);
  });

  it('reaches every position when shuffling, so the right answer has no favourite place', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 200; seed++) {
      positions.add(createRng(seed).shuffle(['answer', 'x', 'y']).indexOf('answer'));
    }
    expect([...positions].sort()).toEqual([0, 1, 2]);
  });

  it('gives named streams that do not depend on the order they are asked for', () => {
    const first = rngFor(5, 'choices', 3).next();
    rngFor(5, 'plan').next();
    expect(rngFor(5, 'choices', 3).next()).toBe(first);
    expect(rngFor(5, 'choices', 4).next()).not.toBe(first);
  });

  it('hashes strings to unsigned 32-bit integers', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('training')).toBe(hashString('training'));
    expect(hashString('training')).not.toBe(hashString('academy'));
    expect(hashString('a much longer string, to be safe')).toBeLessThanOrEqual(0xffffffff);
  });
});
