// @vitest-environment happy-dom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Services from '@/game/services';
import type { Suggestion } from '@/engine/recommend';
import type { Repository } from '@/storage';
import { WORLDS, isOpen, lessonsOf, worldById } from '@/game/worlds';
import { DAY_MS, answerCorrectly, newSession, play, sampleLesson } from '../helpers/content';
import { freshBackend, repositoryOn } from '../helpers/storage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * What a page is told when it asks what to offer next: nothing until it is known, and then what the engine
 * makes of this player's record, the day it is on this device, and where a grown-up chose to begin.
 */

const lesson = sampleLesson();
const garden = worldById('number-garden');
const [FIRST = '', SECOND = ''] = lessonsOf(garden);
/** The middle of a day, so that the day is the same day wherever these tests are run. */
const NOON = Date.UTC(2026, 10, 2, 12, 0, 0);

let repository: Repository;
const clock = { now: NOON };
/** What stands between a page and the record: shut by a test that means to look before the record is read. */
let door: { open: () => void; opened: Promise<void> };
function shut(): void {
  let open = (): void => undefined;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  door = { open, opened };
}

vi.mock('@/game/services', async (original) => ({
  ...(await original<typeof Services>()),
  getRepository: () =>
    Promise.resolve(
      new Proxy(repository, {
        get(target, key) {
          if (key !== 'listAttempts') {
            const value: unknown = Reflect.get(target, key, target);
            return typeof value === 'function' ? value.bind(target) : value;
          }
          return async (profileId: string) => {
            await door.opened;
            return target.listAttempts(profileId);
          };
        },
      }),
    ),
  now: () => clock.now,
}));

beforeEach(async () => {
  vi.resetModules();
  vi.doUnmock('@/game/adviceEngine');
  repository = await repositoryOn(freshBackend('memory'));
  clock.now = NOON;
  shut();
  door.open();
});

afterEach(cleanup);

async function player(name: string): Promise<string> {
  const profile = await repository.createProfile({ name, avatar: 'leaf' });
  await repository.setActiveProfileId(profile.id);
  return profile.id;
}

/** The first activity of the garden, played to its end at a given time with every answer right. */
async function playedTheFirst(profileId: string, at: number): Promise<void> {
  const start = { ...newSession(lesson, 7, `sitting-${profileId}-${at}`, at), profileId };
  const { session, attempts } = play(lesson, start, answerCorrectly, { now: at });
  expect(session.status).toBe('completed');
  await repository.saveProgress(start);
  for (const attempt of attempts) await repository.saveProgress(session, { ...attempt, profileId });
  await repository.saveProgress(session);
}

interface Told {
  known: boolean;
  top: Suggestion | null;
  garden: Suggestion | null;
  done: string[];
}
const told = (): Told => JSON.parse(screen.getByTestId('advice').textContent) as Told;

async function ask(): Promise<void> {
  const { useAdvice } = await import('@/game/advice');
  function Asked() {
    const { known, advice, done } = useAdvice();
    return (
      <output data-testid="advice">
        {JSON.stringify({
          known,
          top: advice?.top ?? null,
          garden: advice?.byWorld['number-garden'] ?? null,
          done: [...done],
        })}
      </output>
    );
  }
  render(<Asked />);
}
const known = () => waitFor(() => expect(told().known).toBe(true));
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 120)));

describe('what to offer next', () => {
  it('is not said until it is known: neither where Play goes nor where Glim points', async () => {
    const id = await player('Robin');
    await playedTheFirst(id, NOON - 2 * DAY_MS);
    shut();
    await ask();
    await settle();
    // Who is playing and what they have finished are known; the record has not been read. Nothing is offered.
    expect(told()).toEqual({ known: false, top: null, garden: null, done: [FIRST] });
    door.open();
    await known();
    expect(told().garden).not.toBeNull();
  });

  it('for someone who has played nothing is each world’s first activity, and the first world', async () => {
    await player('Robin');
    await ask();
    await known();
    expect(told().garden).toMatchObject({ lessonId: FIRST, world: 'number-garden', kind: 'new' });
    const first = WORLDS.filter(isOpen)[0];
    expect(told().top).toMatchObject({ world: first?.id, lessonId: lessonsOf(first ?? garden)[0] });
  });

  it('goes on to something new on the day an activity was finished, and the day after', async () => {
    const id = await player('Robin');
    await playedTheFirst(id, NOON);
    await ask();
    await known();
    expect(told().garden).toMatchObject({ lessonId: SECOND, kind: 'new' });
    cleanup();
    clock.now = NOON + DAY_MS;
    await ask();
    await known();
    expect(told().garden).toMatchObject({ lessonId: SECOND, kind: 'new' });
  });

  it('comes back, two days later, to an activity done alone three times: by the day this device says it is', async () => {
    const id = await player('Robin');
    await playedTheFirst(id, NOON);
    clock.now = NOON + 2 * DAY_MS;
    await ask();
    await known();
    const offered = told().garden;
    expect(offered).toMatchObject({ lessonId: FIRST, kind: 'practice' });
    expect(offered?.reasons[0]).toMatchObject({
      why: 'due',
      basis: 'provisional',
      daysSince: 2,
      waitDays: 2,
    });
    // It is the one thing that would be chosen from everything: Glim points at the garden.
    expect(told().top).toMatchObject({ world: 'number-garden', lessonId: FIRST });
  });

  it('begins where a grown-up has chosen, and says that is why', async () => {
    const id = await player('Robin');
    const third = lessonsOf(garden)[2] ?? '';
    const profile = await repository.getProfile(id);
    await repository.updateProfile(id, {
      settings: {
        ...(profile?.settings ?? { sessionMinutes: null }),
        startAt: { 'number-garden': third },
      },
    });
    await ask();
    await known();
    expect(told().garden).toMatchObject({ lessonId: third, kind: 'new' });
    expect(told().garden?.reasons[0]).toEqual({ why: 'chosen-start' });
  });

  it('is asked again when a grown-up chooses another place, and the answer for the old place is not kept', async () => {
    const id = await player('Robin');
    await ask();
    await known();
    expect(told().garden).toMatchObject({ lessonId: FIRST });
    const third = lessonsOf(garden)[2] ?? '';
    const { updateProfile } = await import('@/game/profiles');
    shut();
    await act(() =>
      updateProfile(id, {
        settings: { sessionMinutes: null, startAt: { 'number-garden': third } },
      }),
    );
    await settle();
    // The new answer is on its way: the old one is not given in its place.
    expect(told()).toMatchObject({ known: false, garden: null });
    door.open();
    await waitFor(() => expect(told().garden).toMatchObject({ lessonId: third }));
  });

  it('is never one player’s for another', async () => {
    const robin = await player('Robin');
    await playedTheFirst(robin, NOON - 2 * DAY_MS);
    const sam = await repository.createProfile({ name: 'Sam', avatar: 'star' });
    await repository.setActiveProfileId(robin);
    await ask();
    await known();
    expect(told().garden).toMatchObject({ lessonId: FIRST, kind: 'practice' });

    shut();
    const { setActiveProfile } = await import('@/game/profiles');
    await act(() => setActiveProfile(sam.id));
    await settle();
    expect(told()).toMatchObject({ known: false, top: null, garden: null });
    door.open();
    await known();
    expect(told().garden).toMatchObject({ lessonId: FIRST, kind: 'new' });
    expect(told().done).toEqual([]);
  });

  it('is known, as nothing to say, where nobody is playing', async () => {
    await ask();
    await known();
    expect(told()).toEqual({ known: true, top: null, garden: null, done: [] });
  });

  it('is known, as nothing to say, when the part of the game that works it out cannot be fetched', async () => {
    await player('Robin');
    vi.doMock('@/game/adviceEngine', () => {
      throw new Error('The device is not connected.');
    });
    await ask();
    await known();
    expect(told()).toMatchObject({ known: true, top: null, garden: null });
    const { getDiagnostics } = await import('@/app/diagnostics');
    expect(getDiagnostics().errors.map((error) => error.source)).toEqual(['chunk']);
  });

  it('is known, as nothing to say, when the record cannot be read', async () => {
    await player('Robin');
    vi.spyOn(repository, 'listAttempts').mockRejectedValue(new Error('The record cannot be read.'));
    await ask();
    await known();
    expect(told()).toMatchObject({ known: true, top: null, garden: null });
    const { getDiagnostics } = await import('@/app/diagnostics');
    expect(getDiagnostics().errors.map((error) => error.source)).toEqual(['storage']);
  });
});
