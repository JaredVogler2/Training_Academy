import { describe, expect, it } from 'vitest';
import inventorIsland from '@/content/packs/inventor-island.v2.json';
import { createSession, type ContentPack, type Lesson } from '@/engine';
import { PACKS } from '../../e2e/play';
import { seedThatBrings } from '../../e2e/sittings';

/**
 * A browser test that is about one step of an activity plans its sitting from a seed that brings that step first,
 * and does not play sittings until luck brings it. (One did, and failed in CI by luck alone: eight sittings in a
 * row miss one bench of ten, three drawn a sitting, one time in seventeen.) What finds the seed decides whether
 * such a test is about anything, so it is tested here, where no browser is needed.
 */

const packs: ContentPack[] = [...Object.values(PACKS), inventorIsland as unknown as ContentPack];
const lessons: Lesson[] = packs.flatMap((pack) => pack.lessons);

/** The step a sitting planned from a seed asks first of those done alone. */
function firstAlone(lesson: Lesson, seed: number): string | undefined {
  const session = createSession(lesson, {
    id: 'a-sitting',
    profileId: 'somebody',
    seed,
    now: 0,
    contentVersion: 1,
  });
  return session.steps.find((step) => step.stage === 'independent')?.challengeId;
}

describe('the seed a browser test plans its sitting from', () => {
  it('brings first, of the steps done alone, the one the test is about: every step of every pool can be had', () => {
    let asked = 0;
    for (const lesson of lessons) {
      for (const wanted of lesson.plan.independent.pool) {
        const seed = seedThatBrings(lesson.id, (challenge) => challenge.id === wanted);
        expect(firstAlone(lesson, seed), `${wanted}, from seed ${String(seed)}`).toBe(wanted);
        asked += 1;
      }
    }
    // Every pool of every activity these helpers know: hundreds of steps, none of them out of reach.
    expect(asked).toBeGreaterThan(300);
  });

  it('is the first seed that does, so the same test plans the same sitting every time', () => {
    const lesson = lessons.find((each) => each.id === 'ii-shelter-01');
    if (!lesson) throw new Error('The shelter is not in the pack.');
    const wanted = 'ii-shelter-01.too-low-in-a-breeze';
    const seed = seedThatBrings('ii-shelter-01', (challenge) => challenge.id === wanted);
    expect(seedThatBrings('ii-shelter-01', (challenge) => challenge.id === wanted)).toBe(seed);
    for (let earlier = 1; earlier < seed; earlier++) {
      expect(firstAlone(lesson, earlier), `seed ${String(earlier)}`).not.toBe(wanted);
    }
  });

  it('goes by what the step is, not by what it is called: the low wall before the sunflower, in a breeze', () => {
    const lesson = lessons.find((each) => each.id === 'ii-shelter-01');
    if (!lesson) throw new Error('The shelter is not in the pack.');
    const seed = seedThatBrings(
      'ii-shelter-01',
      (challenge) =>
        challenge.kind === 'make' &&
        challenge.task.type === 'design' &&
        challenge.task.given.plant === 'sunflower' &&
        challenge.task.given.wind === 'breeze',
    );
    expect(firstAlone(lesson, seed)).toBe('ii-shelter-01.too-low-in-a-breeze');
  });

  it('says so, by the activity’s name, when no sitting begins with what is wanted', () => {
    // A step that is shown and never drawn to be done alone: no seed brings it.
    expect(() =>
      seedThatBrings('ii-shelter-01', (challenge) => challenge.id === 'ii-shelter-01.demo-guess'),
    ).toThrow(/ii-shelter-01.*is it still in the pool/);
    expect(() => seedThatBrings('ii-shelter-01', () => false)).toThrow(/none begins/);
  });

  it('says so when no pack has the activity', () => {
    expect(() => seedThatBrings('ii-no-such-thing-01', () => true)).toThrow(
      /No pack these helpers know has an activity called ii-no-such-thing-01/,
    );
  });
});
