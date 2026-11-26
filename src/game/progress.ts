import { useEffect, useState } from 'react';
import { recordError } from '@/app/diagnostics';
import { refreshProfiles, useProfiles } from './profiles';
import { getRepository } from './services';
import { WORLDS, isOpen, lessonsOf, type WorldInfo } from './worlds';

/**
 * How far the player who is playing has got: which activities they have finished at least once. It is what lets
 * "Play" go to the next thing, and Glim point at the world that has it.
 */

const NOTHING: ReadonlySet<string> = new Set();

/**
 * Whether what the player has finished is known yet. It is read from the device a moment after a page opens,
 * and until then nothing is claimed: the set is empty, and "Play" goes where it would for someone who has done
 * nothing. A page that shows the next thing says when it knows (`data-settled` on a world's page), so that
 * nothing reads it for an answer too soon. For nobody, nothing is ever read: ask who is playing as well.
 */
export function finishedIsKnown(done: ReadonlySet<string>): boolean {
  return done !== NOTHING;
}

/** The lessons the player who is playing has finished, by id. Empty until it is known, and for nobody. */
export function useFinishedLessons(): ReadonlySet<string> {
  const { status, activeId } = useProfiles();
  const [found, setFound] = useState<{ for: string; done: ReadonlySet<string> } | null>(null);

  // Who is playing has to be known before what they have finished can be. The map finds out as it opens, and
  // so do an activity and the grown-ups' area; but a world's page opened by its own address (the page loaded
  // again, a tab the phone has brought back) has none of them before it. Without this it showed nothing as
  // finished and sent "Play" back to the first activity.
  useEffect(() => {
    if (status === 'loading') void refreshProfiles();
  }, [status]);

  useEffect(() => {
    if (activeId === null) return;
    let current = true;
    getRepository()
      .then((repository) => repository.listSessions(activeId))
      .then(
        (sessions) => {
          if (!current) return;
          setFound({
            for: activeId,
            done: new Set(
              sessions
                .filter((session) => session.status === 'completed')
                .map((session) => session.lessonId),
            ),
          });
        },
        (error: unknown) => {
          recordError('storage', error);
          // What cannot be read is taken as nothing finished, and that is as much as will be known.
          if (current) setFound({ for: activeId, done: new Set() });
        },
      );
    return () => {
      current = false;
    };
  }, [activeId]);

  return found !== null && found.for === activeId ? found.done : NOTHING;
}

/**
 * The lesson "Play" goes to in a world: the first not yet finished; once they all are, the first again. Where a
 * grown-up has chosen a place to begin (`startAt`), it is the first not yet finished from there on, and only
 * when all of those are done, the first not yet finished before it. Nothing is skipped for good.
 */
export function nextLessonIn(
  world: WorldInfo,
  done: ReadonlySet<string>,
  startAt?: string,
): string | null {
  const order = lessonsOf(world);
  const from = Math.max(0, startAt === undefined ? 0 : order.indexOf(startAt));
  const todo = (ids: readonly string[]) => ids.find((id) => !done.has(id));
  return todo(order.slice(from)) ?? todo(order.slice(0, from)) ?? order[from] ?? null;
}

/**
 * The world to go to next: the first, in teaching order, that still has something unfinished. When everything has
 * been finished it is the first world again; when no world has anything to play there is none.
 */
export function nextWorld(done: ReadonlySet<string>): WorldInfo | null {
  const open = WORLDS.filter(isOpen);
  return open.find((world) => lessonsOf(world).some((id) => !done.has(id))) ?? open[0] ?? null;
}
