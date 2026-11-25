// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from '@/storage';
import { WORLDS, isOpen, lessonsOf, worldById } from '@/game/worlds';
import { answerCorrectly, newSession, play, sampleLesson } from '../helpers/content';
import { freshBackend, repositoryOn } from '../helpers/storage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * What has been finished, and what that makes the next thing to do.
 *
 * The part with a screen in it is about one fault: a page that shows what has been finished has to find out who
 * is playing, and a world's page opened by its own address had nothing before it that did.
 */

const lesson = sampleLesson();

let repository: Repository;
vi.mock('@/game/services', () => ({ getRepository: () => Promise.resolve(repository) }));

/** A device on which someone has finished the sample activity. Returns the player's id. */
async function someoneHasPlayed(): Promise<string> {
  const profile = await repository.createProfile({ name: 'Robin', avatar: 'leaf' });
  await repository.setActiveProfileId(profile.id);
  const { session } = play(
    lesson,
    { ...newSession(lesson), profileId: profile.id },
    answerCorrectly,
  );
  expect(session.status).toBe('completed');
  await repository.saveProgress(session);
  return profile.id;
}

beforeEach(async () => {
  // The players are kept in a module of their own, which remembers; each test starts as a page newly loaded does.
  vi.resetModules();
  repository = await repositoryOn(freshBackend('memory'));
});

afterEach(cleanup);

describe('what has been finished, on a page that is the first thing opened', () => {
  it('is found out without the map, an activity or the grown-ups’ area having been open', async () => {
    await someoneHasPlayed();
    const { useFinishedLessons } = await import('@/game/progress');
    function Finished() {
      return <p data-testid="done">{[...useFinishedLessons()].join(' ')}</p>;
    }

    render(<Finished />);
    // Nothing is claimed before it is known.
    expect(screen.getByTestId('done').textContent).toBe('');
    await waitFor(() => expect(screen.getByTestId('done').textContent).toBe(lesson.id));
  });

  it('asks who is playing once, not every time something is shown', async () => {
    await someoneHasPlayed();
    const asked = vi.spyOn(repository, 'getActiveProfileId');
    const { useFinishedLessons } = await import('@/game/progress');
    function Finished() {
      return <p data-testid="done">{[...useFinishedLessons()].join(' ')}</p>;
    }

    const first = render(<Finished />);
    await waitFor(() => expect(screen.getByTestId('done').textContent).toBe(lesson.id));
    first.unmount();
    render(<Finished />);
    await waitFor(() => expect(screen.getByTestId('done').textContent).toBe(lesson.id));
    expect(asked).toHaveBeenCalledTimes(1);
  });

  it('is nothing on a device nobody has played on, and stays so', async () => {
    const { useFinishedLessons } = await import('@/game/progress');
    const { useProfiles } = await import('@/game/profiles');
    function Finished() {
      const { status } = useProfiles();
      return (
        <p data-testid="done" data-status={status}>
          {[...useFinishedLessons()].join(' ')}
        </p>
      );
    }

    render(<Finished />);
    await waitFor(() =>
      expect(screen.getByTestId('done').getAttribute('data-status')).toBe('ready'),
    );
    expect(screen.getByTestId('done').textContent).toBe('');
  });
});

describe('the next thing to do', () => {
  it('in a world is the first activity not yet finished, and the first again once all are', async () => {
    const { nextLessonIn } = await import('@/game/progress');
    const world = worldById('number-garden');
    const order = lessonsOf(world);
    expect(order.length).toBeGreaterThan(2);
    expect(nextLessonIn(world, new Set())).toBe(order[0]);
    expect(nextLessonIn(world, new Set([order[0] ?? '']))).toBe(order[1]);
    // One finished out of turn does not move the next one past those before it.
    expect(nextLessonIn(world, new Set([order[2] ?? '']))).toBe(order[0]);
    expect(nextLessonIn(world, new Set(order))).toBe(order[0]);
  });

  it('begins where a grown-up has chosen, and comes back to what was passed over only at the end', async () => {
    const { nextLessonIn } = await import('@/game/progress');
    const world = worldById('number-garden');
    const order = lessonsOf(world);
    const start = order[3] ?? '';
    const done = (...ids: (string | undefined)[]) => new Set(ids.map((id) => id ?? ''));
    expect(nextLessonIn(world, new Set(), start)).toBe(start);
    // From there on it goes as it always does: the first not yet finished.
    expect(nextLessonIn(world, done(order[3]), start)).toBe(order[4]);
    expect(nextLessonIn(world, done(order[3], order[5]), start)).toBe(order[4]);
    // What comes before the beginning is not offered while anything after it is left…
    expect(nextLessonIn(world, done(order[0]), start)).toBe(start);
    // …and is, once nothing is: nothing is passed over for good.
    expect(nextLessonIn(world, new Set(order.slice(3)), start)).toBe(order[0]);
    expect(nextLessonIn(world, new Set([...order.slice(3), order[0] ?? '']), start)).toBe(order[1]);
    // Everything finished: the beginning that was chosen, again.
    expect(nextLessonIn(world, new Set(order), start)).toBe(start);
  });

  it('begins at the beginning where the place chosen is not an activity of that world', async () => {
    const { nextLessonIn } = await import('@/game/progress');
    const world = worldById('number-garden');
    const order = lessonsOf(world);
    expect(nextLessonIn(world, new Set(), 'rc-letters-01')).toBe(order[0]);
    expect(nextLessonIn(world, new Set(), '')).toBe(order[0]);
    expect(nextLessonIn(world, new Set([order[0] ?? '']), 'no-such-activity')).toBe(order[1]);
  });

  it('on the map is the first world with something unfinished, and the first again once none has', async () => {
    const { nextWorld } = await import('@/game/progress');
    const open = WORLDS.filter(isOpen);
    const first = open[0];
    const second = open[1];
    if (!first || !second) throw new Error('Fewer than two worlds are open.');
    expect(nextWorld(new Set())?.id).toBe(first.id);
    expect(nextWorld(new Set(lessonsOf(first)))?.id).toBe(second.id);
    expect(nextWorld(new Set(open.flatMap((world) => lessonsOf(world))))?.id).toBe(first.id);
  });
});

describe('someone who is new to the game', () => {
  it('is a player who has not been shown how to play and has never begun an activity', async () => {
    const { isNewToTheGame } = await import('@/game/profiles');
    const profile = await repository.createProfile({ name: 'Mina', avatar: 'moon' });
    expect(await isNewToTheGame(profile)).toBe(true);
  });

  it('is not one who has been shown, or has passed it by', async () => {
    const { isNewToTheGame } = await import('@/game/profiles');
    const profile = await repository.createProfile({ name: 'Mina', avatar: 'moon' });
    const shown = await repository.updateProfile(profile.id, {
      settings: { ...profile.settings, howTo: 'seen' },
    });
    expect(await isNewToTheGame(shown)).toBe(false);
  });

  it('is not one who was playing before there was anything to be shown', async () => {
    const { isNewToTheGame } = await import('@/game/profiles');
    const id = await someoneHasPlayed();
    const profile = await repository.getProfile(id);
    if (!profile) throw new Error('The player was not kept.');
    expect(profile.settings.howTo).toBeUndefined();
    expect(await isNewToTheGame(profile)).toBe(false);
  });

  it('is not one who has only begun an activity and left it', async () => {
    const { isNewToTheGame } = await import('@/game/profiles');
    const profile = await repository.createProfile({ name: 'Mina', avatar: 'moon' });
    await repository.saveProgress({ ...newSession(lesson), profileId: profile.id });
    expect(await isNewToTheGame(profile)).toBe(false);
  });
});
