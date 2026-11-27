import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { getSkillEvidence, type Attempt, type LessonSession } from '@/engine';
import { DATA_VERSION, PAIRS_PAR, migrate, type Repository } from '@/storage';
import { DAY_MS, T0, attempt, dayOf, newSession, sampleLesson } from '../helpers/content';
import { freshBackend, repositoryOn } from '../helpers/storage';

/**
 * What must hold of what is stored, whatever was played: one player's record is never another's; a copy saved
 * and loaded back is the record to the letter, with every distinction the record makes still in it; and what
 * was stored by an earlier version of the game says no more of a child after it is brought up to date than it
 * did before.
 */

const lesson = sampleLesson();
const SKILLS = ['math.quantity.match-sets-to-3', 'memory.recognition.find-pairs', 'phonics.s.one'];
const BOARDS = Object.keys(PAIRS_PAR).map((id) => id.replace('mf-pairs-01.', ''));

/** One answer, as anything a child or a grown-up could have made it. */
const answer = fc.record({
  skill: fc.constantFrom(...SKILLS),
  question: fc.integer({ min: 0, max: 5 }),
  day: fc.integer({ min: 0, max: 6 }),
  stage: fc.constantFrom<'guided' | 'independent'>('guided', 'independent'),
  tryIndex: fc.integer({ min: 0, max: 2 }),
  hintLevel: fc.integer({ min: 0, max: 2 }),
  adult: fc.boolean(),
  right: fc.boolean(),
  clean: fc.boolean(),
  chance: fc.constantFrom(undefined, 0, 0.3333, 0.5),
});
type Answer = typeof answer extends fc.Arbitrary<infer T> ? T : never;

/** The answers as records of one player's, in one sitting a day, numbered in the order given. */
function recordOf(profileId: string, answers: readonly Answer[]): Attempt[] {
  const seq = new Map<number, number>();
  return answers.map((each) => {
    const index = seq.get(each.day) ?? 0;
    seq.set(each.day, index + 1);
    const at = T0 + each.day * DAY_MS + index * 1000;
    const helped = each.hintLevel > 0;
    return attempt({
      profileId,
      sessionId: `sitting-${profileId}-${String(each.day)}`,
      seq: index,
      at,
      day: dayOf(at),
      lessonId: lesson.id,
      skillId: each.skill,
      challengeId: `${lesson.id}.q${String(each.question)}`,
      variant: `kind-${String(each.question % 3)}`,
      stage: each.stage,
      tryIndex: each.tryIndex,
      hintLevel: each.hintLevel,
      assistance: each.adult ? 'adult' : helped ? 'hint' : 'none',
      outcome: each.right ? 'correct' : 'incorrect',
      ...(each.right && !each.clean ? { clean: false as const } : {}),
      ...(each.tryIndex === 0 && !helped && each.chance !== undefined
        ? { chance: each.chance }
        : {}),
    });
  });
}

async function store(repository: Repository, attempts: readonly Attempt[]): Promise<void> {
  const sittings = new Map<string, LessonSession>();
  for (const each of attempts) {
    let sitting = sittings.get(each.sessionId);
    if (!sitting) {
      sitting = {
        ...newSession(lesson, 1, each.sessionId, each.at),
        profileId: each.profileId,
      };
      sittings.set(each.sessionId, sitting);
      await repository.saveProgress(sitting);
    }
    await repository.saveProgress(sitting, each);
  }
}

const said = (attempts: readonly Attempt[]) =>
  SKILLS.map((skill) => {
    const {
      lastAttemptAt: _at,
      lastIndependentSuccessAt: _last,
      ...rest
    } = getSkillEvidence(attempts, skill);
    return rest;
  });
const byId = (attempts: readonly Attempt[]) =>
  [...attempts].sort((a, b) => a.id.localeCompare(b.id));

const RUNS = { numRuns: 40 };

/** Load a saved copy, and say how many answers it added: a copy that is refused fails the test that loaded it. */
async function load(repository: Repository, copy: string): Promise<number> {
  const loaded = await repository.importBundle(copy);
  if (!loaded.ok) throw new Error(`The copy was refused: ${loaded.problem} (${loaded.detail}).`);
  return loaded.added.attempts;
}

describe('for whatever was played', () => {
  it('one player’s record is theirs alone: nothing of another’s is in it, said of it, or lost with it', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(answer, { maxLength: 20 }),
        fc.array(answer, { maxLength: 20 }),
        async (hers, his) => {
          const repository = await repositoryOn(freshBackend('memory'));
          const ada = await repository.createProfile({ name: 'Ada', avatar: 'star' });
          const bo = await repository.createProfile({ name: 'Bo', avatar: 'sun' });
          const adas = recordOf(ada.id, hers);
          const bos = recordOf(bo.id, his);
          // Written down turn and turn about, as two children sharing a tablet would.
          const both: Attempt[] = [];
          for (let index = 0; index < Math.max(adas.length, bos.length); index++) {
            const [a, b] = [adas[index], bos[index]];
            if (a) both.push(a);
            if (b) both.push(b);
          }
          await store(repository, both);

          expect(byId(await repository.listAttempts(ada.id))).toEqual(byId(adas));
          expect(byId(await repository.listAttempts(bo.id))).toEqual(byId(bos));
          // What is said of Ada is what would be said if Bo had never played.
          expect(said(await repository.listAttempts(ada.id))).toEqual(said(adas));
          // And Bo's going takes nothing of hers with it.
          await repository.deleteProfile(bo.id);
          expect(byId(await repository.listAttempts(ada.id))).toEqual(byId(adas));
          expect(await repository.listAttempts(bo.id)).toEqual([]);
        },
      ),
      RUNS,
    );
  });

  it('a copy saved, with everything erased, and loaded back is the record to the letter', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(answer, { maxLength: 30 }), async (answers) => {
        const repository = await repositoryOn(freshBackend('memory'));
        const ada = await repository.createProfile({ name: 'Ada', avatar: 'star' });
        const record = recordOf(ada.id, answers);
        await store(repository, record);
        const before = await repository.listAttempts(ada.id);
        const copy = JSON.stringify(await repository.exportProfile(ada.id));

        await repository.resetAll();
        expect(await repository.listProfiles()).toEqual([]);
        expect(await load(repository, copy)).toBe(record.length);

        // Every answer, with whether it was a first try, how much help it had, whether a grown-up was helping,
        // whether it showed the skill and how easy it was to guess: none of it lost or changed.
        const after = await repository.listAttempts(ada.id);
        expect(after).toEqual(before);
        expect(said(after)).toEqual(said(record));
        // Loaded a second time, it adds nothing.
        expect(await load(repository, copy)).toBe(0);
        expect(await repository.listAttempts(ada.id)).toEqual(before);
      }),
      RUNS,
    );
  });

  it('a copy loaded into a device that has part of the record makes it whole, whichever part it had', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(answer, { minLength: 1, maxLength: 24 }),
        fc.integer({ min: 0, max: 24 }),
        async (answers, kept) => {
          const elsewhere = await repositoryOn(freshBackend('memory'));
          const ada = await elsewhere.createProfile({ name: 'Ada', avatar: 'star' });
          const record = recordOf(ada.id, answers);
          // An older copy: the record as it stood after the first so many answers.
          const earlier = record.slice(0, Math.min(kept, record.length));
          await store(elsewhere, earlier);
          const old = JSON.stringify(await elsewhere.exportProfile(ada.id));
          await store(elsewhere, record.slice(earlier.length));
          const whole = JSON.stringify(await elsewhere.exportProfile(ada.id));

          const here = await repositoryOn(freshBackend('memory'));
          await load(here, old);
          expect(byId(await here.listAttempts(ada.id))).toEqual(byId(earlier));
          expect(await load(here, whole)).toBe(record.length - earlier.length);
          expect(byId(await here.listAttempts(ada.id))).toEqual(byId(record));
          // The older copy loaded on top of the newer takes nothing away.
          expect(await load(here, old)).toBe(0);
          expect(said(await here.listAttempts(ada.id))).toEqual(said(record));
        },
      ),
      RUNS,
    );
  });
});

describe('for whatever an earlier version of the game stored', () => {
  /** A game of pairs as it was written down before the record could say it took too many turns. */
  const game = fc.record({
    board: fc.constantFrom(...BOARDS),
    turns: fc.integer({ min: 2, max: 40 }),
    day: fc.integer({ min: 0, max: 4 }),
    right: fc.boolean(),
    stage: fc.constantFrom<'guided' | 'independent'>('guided', 'independent'),
  });

  it('bringing it up to date says no more of a child than it said before, and changes nothing but the mark', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(game, { maxLength: 24 }), async (games) => {
        const stored = games.map((each, index) => {
          const at = T0 + each.day * DAY_MS + index * 1000;
          return attempt({
            sessionId: `sitting-${String(each.day)}`,
            seq: index,
            at,
            day: dayOf(at),
            lessonId: 'mf-pairs-01',
            lessonVersion: 1,
            challengeId: `mf-pairs-01.${each.board}`,
            skillId: 'memory.recognition.find-pairs',
            variant: each.board,
            stage: each.stage,
            outcome: each.right ? 'correct' : 'incorrect',
            response: String(each.turns),
          });
        });
        const driver = await freshBackend('memory').open();
        await driver.write([
          { op: 'put', store: 'meta', key: 'schema', value: { dataVersion: 1 } },
          ...stored.map((value) => ({
            op: 'put' as const,
            store: 'attempts' as const,
            key: value.id,
            value,
          })),
        ]);
        const outcome = await migrate(driver);
        expect(outcome).toMatchObject({ status: 'ready', to: DATA_VERSION });
        const after = (await driver.list('attempts')) as Attempt[];

        // Nothing added, nothing lost, nothing changed but the mark; and the mark is on exactly the games that
        // were right in more turns than their board allows.
        expect(after).toHaveLength(stored.length);
        for (const was of stored) {
          const now = after.find((each) => each.id === was.id);
          const over =
            was.outcome === 'correct' && Number(was.response) > (PAIRS_PAR[was.challengeId] ?? 0);
          expect(now?.clean, was.id).toBe(over ? false : undefined);
          expect({ ...now, clean: undefined }).toEqual({ ...was, clean: undefined });
        }

        // What is said of the child afterwards is never more than was said before.
        const skill = 'memory.recognition.find-pairs';
        const [before, now] = [getSkillEvidence(stored, skill), getSkillEvidence(after, skill)];
        expect(now.independentSuccesses).toBeLessThanOrEqual(before.independentSuccesses);
        expect(now.guidedSuccesses).toBeLessThanOrEqual(before.guidedSuccesses);
        const ORDER = [
          'not-yet-observed',
          'exploring',
          'guided',
          'practicing',
          'provisionally-independent',
          'consistently-independent',
        ];
        expect(ORDER.indexOf(now.status)).toBeLessThanOrEqual(ORDER.indexOf(before.status));
        expect(now.totalAttempts).toBe(before.totalAttempts);
        // And brought up to date a second time, it is as it was left.
        await migrate(driver);
        expect(await driver.list('attempts')).toEqual(after);
      }),
      RUNS,
    );
  });
});
