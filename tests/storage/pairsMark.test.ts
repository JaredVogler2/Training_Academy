import { beforeEach, describe, expect, it } from 'vitest';
import { loadPack } from '@/content';
import { getSkillEvidence, parseAttempt, type Attempt } from '@/engine';
import {
  DATA_VERSION,
  MIGRATIONS,
  PAIRS_PAR,
  migrate,
  withThePairsMark,
  type StorageDriver,
} from '@/storage';
import { T0, attempt } from '../helpers/content';
import { BACKEND_NAMES, freshBackend, repositoryOn } from '../helpers/storage';

/**
 * Until data version 2 a game of pairs that took far more turns than remembering needs was written into the
 * record with nothing to tell it from one that took few. What is stored, and what is loaded from a file saved
 * then, is given the mark it should have had; and nothing else is touched.
 */

const SKILL = 'memory.recognition.find-pairs';

/** An answer to a board of pairs, as the game wrote it down before data version 2. */
function pairs(board: string, turns: number, overrides: Partial<Attempt> = {}): Attempt {
  return attempt({
    lessonId: 'mf-pairs-01',
    lessonVersion: 1,
    contentVersion: 2,
    challengeId: `mf-pairs-01.${board}`,
    skillId: SKILL,
    variant: board,
    response: String(turns),
    ...overrides,
  });
}

describe('the turns each board of pairs allows', () => {
  it('are the lesson’s own, for every board it has that is ever asked', async () => {
    const pack = await loadPack('memory-forest');
    const lesson = pack.lessons.find((each) => each.id === 'mf-pairs-01');
    // The numbers are for answers written down while the lesson was at this version. A later version is written
    // down by a game that marks its own answers, and needs none.
    expect(lesson?.version).toBe(1);
    const asked = new Set([
      ...(lesson?.plan.guided ?? []),
      ...(lesson?.plan.independent.pool ?? []),
    ]);
    const pars = Object.fromEntries(
      (lesson?.challenges ?? []).flatMap((challenge) =>
        challenge.kind === 'make' && challenge.task.type === 'pairs' && asked.has(challenge.id)
          ? [[challenge.id, challenge.task.par]]
          : [],
      ),
    );
    expect(PAIRS_PAR).toEqual(pars);
    expect(Object.keys(PAIRS_PAR)).toHaveLength(8);
  });

  it('are of the only lesson with pairs in it', async () => {
    const worlds = ['reading-cove', 'number-garden', 'robot-ridge', 'memory-forest'] as const;
    const others = ['inventor-island', 'explorer-harbor', 'music-lab'] as const;
    const withPairs: string[] = [];
    for (const world of [...worlds, ...others]) {
      const pack = await loadPack(world);
      for (const lesson of pack.lessons) {
        const has = lesson.challenges.some(
          (challenge) => challenge.kind === 'make' && challenge.task.type === 'pairs',
        );
        if (has) withPairs.push(`${lesson.id}@${String(lesson.version)}`);
      }
    }
    expect(withPairs).toEqual(['mf-pairs-01@1']);
  });
});

describe('the mark an old answer should have had', () => {
  it('is given to a game of pairs that was right in more turns than its board allows', () => {
    const over = pairs('animals', 7);
    expect(withThePairsMark(over)).toEqual({ ...over, clean: false });
    expect(parseAttempt(withThePairsMark(over)).ok).toBe(true);
    expect(withThePairsMark(pairs('sky-and-leaf', 40))?.clean).toBe(false);
    expect(withThePairsMark(pairs('guided-face-up', 4, { stage: 'guided' }))?.clean).toBe(false);
  });

  it('is not given to one within the turns its board allows', () => {
    expect(withThePairsMark(pairs('animals', 6))).toBeNull();
    expect(withThePairsMark(pairs('animals', 3))).toBeNull();
    expect(withThePairsMark(pairs('food', 8))).toBeNull();
    expect(withThePairsMark(pairs('guided-two', 4))).toBeNull();
  });

  it('is not given twice, nor to anything that is not such an answer', () => {
    expect(withThePairsMark(pairs('animals', 9, { clean: false }))).toBeNull();
    expect(withThePairsMark(pairs('animals', 9, { outcome: 'incorrect' }))).toBeNull();
    expect(withThePairsMark(pairs('animals', 9, { lessonVersion: 2 }))).toBeNull();
    expect(withThePairsMark(pairs('no-such-board', 99))).toBeNull();
    // An amount given out is a number too, and is nothing to do with pairs.
    expect(withThePairsMark(attempt({ response: '9' }))).toBeNull();
    expect(withThePairsMark({ ...pairs('animals', 9), response: 'nine' })).toBeNull();
    expect(withThePairsMark({ ...pairs('animals', 9), response: 9 })).toBeNull();
    for (const other of [null, undefined, 'animals', 7, [], {}]) {
      expect(withThePairsMark(other)).toBeNull();
    }
  });

  it('changes nothing else of the answer, and not the answer it was given', () => {
    const over = pairs('clothes', 12, { seq: 4, at: T0 + 5000 });
    const before = structuredClone(over);
    const marked = withThePairsMark(over);
    expect(over).toEqual(before);
    expect({ ...marked, clean: undefined }).toEqual({ ...before, clean: undefined });
  });
});

describe.each(BACKEND_NAMES)('what is stored, on %s', (name) => {
  let driver: StorageDriver;
  const stored = [
    pairs('guided-two', 4, { seq: 0, stage: 'guided' }),
    pairs('animals', 6, { seq: 1 }),
    pairs('clothes', 13, { seq: 2 }),
    pairs('food', 30, { seq: 3 }),
    pairs('sounds', 5, { seq: 4 }),
    // Another player's, and something that is not pairs at all.
    pairs('animals', 20, { seq: 5, sessionId: 's-2', profileId: 'p-2' }),
    attempt({ seq: 6, sessionId: 's-3', response: '9' }),
  ];

  beforeEach(async () => {
    driver = await freshBackend(name).open();
    await driver.write([
      { op: 'put', store: 'meta', key: 'schema', value: { dataVersion: 1 } },
      { op: 'put', store: 'profiles', key: 'p-1', value: { id: 'p-1' } },
      ...stored.map((value) => ({
        op: 'put' as const,
        store: 'attempts' as const,
        key: value.id,
        value,
      })),
    ]);
  });

  it('is marked once, when the game first opens it, and only where it should be', async () => {
    const outcome = await migrate(driver);
    expect(outcome).toMatchObject({ status: 'ready', from: 1, to: DATA_VERSION });
    expect(outcome.status === 'ready' && outcome.applied).toHaveLength(MIGRATIONS.length);
    const after = (await driver.list('attempts')) as Attempt[];
    const marked = after.filter((each) => each.clean === false).map((each) => each.id);
    expect(marked.sort()).toEqual(['s-1:2', 's-1:3', 's-2:5']);
    // Everything else is as it was, to the letter.
    for (const before of stored) {
      const now = after.find((each) => each.id === before.id);
      expect({ ...now, clean: undefined }).toEqual({ ...before, clean: undefined });
    }
    expect(after).toHaveLength(stored.length);
    // A second opening changes nothing.
    expect(await migrate(driver)).toMatchObject({ status: 'ready', applied: [] });
    expect(await driver.list('attempts')).toEqual(after);
  });

  it('then says what it should of the player: three games in few turns, and two that showed nothing', async () => {
    const before = (await driver.list('attempts', { profileId: 'p-1' })) as Attempt[];
    // As it was written down: five successes alone or with the guide, and "independent so far".
    expect(getSkillEvidence(before, SKILL)).toMatchObject({
      status: 'provisionally-independent',
      independentSuccesses: 4,
      independentMisses: 0,
    });
    await migrate(driver);
    const after = (await driver.list('attempts', { profileId: 'p-1' })) as Attempt[];
    expect(getSkillEvidence(after, SKILL)).toMatchObject({
      status: 'practicing',
      independentSuccesses: 2,
      independentMisses: 2,
      recentAccuracy: 0.5,
    });
  });
});

describe('a file saved before the mark', () => {
  it('is given it on the way in, and a file saved since keeps the mark it has', async () => {
    const clock = { now: T0 };
    const repo = await repositoryOn(freshBackend('memory'), clock);
    const profile = await repo.createProfile({ name: 'Ada', avatar: 'star' });
    const made = await repo.exportProfile(profile.id);
    expect(made.app.dataVersion).toBe(DATA_VERSION);

    // The same file as a game before data version 2 would have saved it: answers with no mark on any of them.
    const { buildBundle } = await import('@/storage/transfer');
    const old = buildBundle({
      profile: made.profile,
      sessions: [],
      attempts: [
        pairs('animals', 6, { seq: 1, profileId: profile.id }),
        pairs('clothes', 13, { seq: 2, profileId: profile.id }),
        pairs('food', 30, { seq: 3, profileId: profile.id }),
      ],
      exportedAt: T0,
      appVersion: '0.0.0-old',
      dataVersion: 1,
    });
    const result = await repo.importBundle(JSON.parse(JSON.stringify(old)));
    expect(result).toMatchObject({ ok: true, added: { attempts: 3 } });
    const attempts = await repo.listAttempts(profile.id);
    expect(attempts.map((each) => [each.id, each.clean])).toEqual([
      ['s-1:1', undefined],
      ['s-1:2', false],
      ['s-1:3', false],
    ]);

    // Saved again and loaded on another device, the marks are as they were.
    const again = await repo.exportProfile(profile.id);
    expect(again.attempts.filter((each) => each.clean === false)).toHaveLength(2);
    const elsewhere = await repositoryOn(freshBackend('memory'), clock, 'other');
    expect(await elsewhere.importBundle(JSON.parse(JSON.stringify(again)))).toMatchObject({
      ok: true,
    });
    expect(await elsewhere.listAttempts(profile.id)).toEqual(attempts);
    // And loading the old file a second time changes nothing.
    expect(await repo.importBundle(old)).toMatchObject({ ok: true, added: { attempts: 0 } });
    expect(await repo.listAttempts(profile.id)).toEqual(attempts);
  });
});
