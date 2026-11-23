import { useEffect, useState } from 'react';
import { recordError } from '@/app/diagnostics';
import { useProfiles } from './profiles';
import { getRepository } from './services';
import { WORLDS, isOpen, lessonsOf, type WorldInfo } from './worlds';

/**
 * How far the player who is playing has got: which activities they have finished at least once. It is what lets
 * "Play" go to the next thing, and Glim point at the world that has it.
 */

const NOTHING: ReadonlySet<string> = new Set();

/** The lessons the player who is playing has finished, by id. Empty until it is known, and for nobody. */
export function useFinishedLessons(): ReadonlySet<string> {
  const { activeId } = useProfiles();
  const [found, setFound] = useState<{ for: string; done: ReadonlySet<string> } | null>(null);

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
        (error: unknown) => recordError('storage', error),
      );
    return () => {
      current = false;
    };
  }, [activeId]);

  return found !== null && found.for === activeId ? found.done : NOTHING;
}

/** The lesson "Play" goes to in a world: the first not yet finished; once they all are, the first again. */
export function nextLessonIn(world: WorldInfo, done: ReadonlySet<string>): string | null {
  const order = lessonsOf(world);
  return order.find((id) => !done.has(id)) ?? order[0] ?? null;
}

/**
 * The world to go to next: the first, in teaching order, that still has something unfinished. When everything has
 * been finished it is the first world again; when no world has anything to play there is none.
 */
export function nextWorld(done: ReadonlySet<string>): WorldInfo | null {
  const open = WORLDS.filter(isOpen);
  return open.find((world) => lessonsOf(world).some((id) => !done.has(id))) ?? open[0] ?? null;
}
