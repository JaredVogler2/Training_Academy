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
