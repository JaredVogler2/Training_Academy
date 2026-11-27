// @vitest-environment happy-dom
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Services from '@/game/services';
import { lessonCalled } from '@/content/lessonList';
import type { Repository } from '@/storage';
import { WORLDS, isOpen, lessonsOf, worldById } from '@/game/worlds';
import { grownUpText as text } from '@/parent/text';
import { DAY_MS, answerCorrectly, newSession, play, sampleLesson } from '../helpers/content';
import { freshBackend, repositoryOn } from '../helpers/storage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * "What Play offers next, and why", in the grown-ups' area: the same advice the big button goes by, with every
 * reason for it in a sentence.
 */

const lesson = sampleLesson();
const garden = worldById('number-garden');
const [FIRST = '', SECOND = ''] = lessonsOf(garden);
const NOON = Date.UTC(2026, 10, 2, 12, 0, 0);

let repository: Repository;
const clock = { now: NOON };
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

async function playedTheFirst(profileId: string, at: number): Promise<void> {
  const start = { ...newSession(lesson, 7, `sitting-${profileId}-${at}`, at), profileId };
  const { session, attempts } = play(lesson, start, answerCorrectly, { now: at });
  await repository.saveProgress(start);
  for (const attempt of attempts) await repository.saveProgress(session, { ...attempt, profileId });
  await repository.saveProgress(session);
}

/** The card, for a player called Robin who is the one playing. Returns their id. */
async function robin(before?: (id: string) => Promise<void>): Promise<string> {
  const profile = await repository.createProfile({ name: 'Robin', avatar: 'leaf' });
  await repository.setActiveProfileId(profile.id);
  await before?.(profile.id);
  const { NextUp } = await import('@/parent/NextUp');
  const { activeProfile, refreshProfiles, useProfiles } = await import('@/game/profiles');
  await refreshProfiles();
  function Card() {
    return <NextUp profile={activeProfile(useProfiles())} />;
  }
  render(<Card />);
  return profile.id;
}

const card = () => screen.getByTestId('next-up');
const offers = () => screen.queryAllByTestId('next-offer');
const offerIn = (world: string) =>
  offers().find((offer) => offer.dataset.world === world) ?? document.createElement('li');
const reasons = (offer: HTMLElement) =>
  within(offer)
    .getAllByRole('listitem')
    .map((item) => item.textContent);
const settled = () => waitFor(() => expect(card().dataset.settled).toBe('true'));
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 150)));

describe('what Play offers next, and why', () => {
  it('is nothing at all where nobody is playing', async () => {
    const { NextUp } = await import('@/parent/NextUp');
    const { container } = render(<NextUp profile={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('says nothing until it has been worked out', async () => {
    shut();
    await robin();
    await settle();
    expect(card().dataset.settled).toBe('false');
    expect(card().textContent).toContain(text.nextReading);
    expect(offers()).toEqual([]);
    expect(screen.queryByTestId('next-top')).toBeNull();
    door.open();
    await settled();
    expect(card().textContent).not.toContain(text.nextReading);
    expect(offers().length).toBeGreaterThan(0);
  });

  it('for someone new lists every open world with its first activity, as something new, and says why', async () => {
    await robin();
    await settled();
    const open = WORLDS.filter(isOpen);
    expect(offers().map((offer) => offer.dataset.world)).toEqual(open.map((world) => world.id));
    for (const world of open) {
      const offer = offerIn(world.id);
      const first = lessonsOf(world)[0] ?? '';
      expect(offer.dataset.lesson, world.id).toBe(first);
      expect(offer.dataset.kind, world.id).toBe('new');
      expect(offer.textContent, world.id).toContain(
        text.nextIn(world.name, lessonCalled(first)?.title ?? ''),
      );
      expect(offer.textContent, world.id).toContain('Something new');
      expect(reasons(offer)[0], world.id).toBe(
        'Nothing has been played in this world yet, so Play begins at its first activity.',
      );
    }
    // Glim points at the first of them.
    const first = open[0];
    expect(screen.getByTestId('next-top').textContent).toBe(
      text.nextGlim(
        first?.name ?? '',
        lessonCalled(lessonsOf(first ?? garden)[0] ?? '')?.title ?? '',
      ),
    );
    expect(screen.getByTestId('next-today').textContent).toBe(
      'Nothing has been played today yet. Nothing played before is due again today.',
    );
  });

  it('says why an activity has come back, naming the skill as a grown-up knows it and never by its id', async () => {
    await robin((id) => playedTheFirst(id, NOON - 2 * DAY_MS));
    await settled();
    const offer = offerIn('number-garden');
    expect(offer.dataset.lesson).toBe(FIRST);
    expect(offer.dataset.kind).toBe('practice');
    expect(offer.textContent).toContain('More practice of something done before');
    expect(reasons(offer)).toEqual([
      '“Match small groups by amount” has been done without help several times, close together. It was last practised 2 days ago; coming back after 2 days is what shows whether it has lasted.',
      'The last activity played was new. While anything is due, the game aims for about 7 in 10 to be ones played before, so this time it is one played before.',
    ]);
    expect(card().textContent).not.toContain('math.quantity');
    expect(screen.getByTestId('next-top').dataset.world).toBe('number-garden');
    expect(screen.getByTestId('next-top').textContent).toBe(
      text.nextGlim('Number Garden', lessonCalled(FIRST)?.title ?? ''),
    );
    expect(screen.getByTestId('next-today').textContent).toBe(
      'Nothing has been played today yet. 1 activity that was played before is due again, counting every world.',
    );
  });

  it('says what was played today, and goes on to something new', async () => {
    await robin((id) => playedTheFirst(id, NOON));
    await settled();
    const offer = offerIn('number-garden');
    expect(offer.dataset.lesson).toBe(SECOND);
    expect(offer.dataset.kind).toBe('new');
    expect(reasons(offer)).toEqual([
      'It is the first activity here that has not been finished.',
      'It builds on “Match small groups by amount”, which has been done without help.',
    ]);
    expect(screen.getByTestId('next-today').textContent).toBe(
      'Played today so far: 1 new activity, and 0 played before. Nothing played before is due again today.',
    );
  });

  it('says so when it cannot be worked out, and that Play then goes by the plain order', async () => {
    vi.doMock('@/game/adviceEngine', () => {
      throw new Error('The device is not connected.');
    });
    await robin();
    await settled();
    expect(card().textContent).toContain(text.nextTrouble);
    expect(offers()).toEqual([]);
  });
});
