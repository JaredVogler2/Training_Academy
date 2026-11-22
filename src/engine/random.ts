/**
 * Seeded randomness. A session stores one 32-bit seed; every choice that looks random to the child (which challenges
 * are drawn, what order the pictures sit in) is derived from it, so a refresh, a replay in a test, or a bug report
 * reproduces the same lesson.
 */

/** FNV-1a, 32 bit. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface Rng {
  /** A float in [0, 1). */
  next(): number;
  /** An integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** A shuffled copy; the input is left alone. */
  shuffle<T>(items: readonly T[]): T[];
}

/** mulberry32: small, fast, and good enough for shuffling a handful of pictures. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (maxExclusive: number): number => Math.floor(next() * maxExclusive);
  return {
    next,
    int,
    shuffle<T>(items: readonly T[]): T[] {
      const copy = items.slice();
      for (let index = copy.length - 1; index > 0; index--) {
        const other = int(index + 1);
        const held = copy[index] as T;
        copy[index] = copy[other] as T;
        copy[other] = held;
      }
      return copy;
    },
  };
}

/**
 * An independent stream for one purpose. Streams are addressed by name rather than drawn in sequence from one
 * generator, so the order in which the UI happens to ask for things cannot change the outcome.
 */
export function rngFor(seed: number, ...scope: (string | number)[]): Rng {
  return createRng(hashString(`${seed}|${scope.join('|')}`));
}
