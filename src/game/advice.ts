import { useEffect, useState } from 'react';
import { ChunkLoadError, loadChunk } from '@/app/chunks';
import { recordError } from '@/app/diagnostics';
import type { Advice } from '@/engine/recommend';
import { activeProfile, useProfiles } from './profiles';
import { finishedIsKnown, useFinishedLessons } from './progress';
import { getRepository, localDay, now } from './services';

/**
 * What to offer next to the player who is playing: where the big Play button goes in each world, and where Glim
 * points on the map. It is worked out by the engine (`engine/recommend.ts`) from the player's record, the day it
 * is, and the concept graph; this is only what fetches those and asks.
 *
 * Until it is known, nothing is claimed. A page that shows the next thing says when it knows (`data-settled`),
 * and Glim points at nothing until then: a hand that pointed at one island and then at another would be worse
 * than a hand that waits a moment. If it cannot be worked out at all (the part of the game that does it could not
 * be fetched), that is as much as will be known, and the page goes by the plain order of the activities.
 */

export interface Advised {
  /** The activities the player has finished at least once: empty until it is known, and for nobody. */
  done: ReadonlySet<string>;
  /** Whether everything that will be known is: who is playing, what they have finished, and what to offer. */
  known: boolean;
  /** What to offer. `null` until it is known, where nobody is playing, and where it could not be worked out. */
  advice: Advice | null;
}

export function useAdvice(): Advised {
  const profiles = useProfiles();
  const player = activeProfile(profiles);
  const done = useFinishedLessons();
  const [found, setFound] = useState<{ for: string; advice: Advice | null } | null>(null);

  const playerId = player?.id ?? null;
  // Where a grown-up has chosen to begin, as text: the same choice is the same text however often it is read.
  const startAt = player?.settings.startAt;
  const leftOut = player?.settings.leftOut;
  const selection = JSON.stringify([startAt, leftOut]);
  const asked = playerId === null ? null : `${playerId} ${selection}`;
  const ready = finishedIsKnown(done);

  useEffect(() => {
    if (playerId === null || asked === null || !ready) return;
    let current = true;
    Promise.all([
      getRepository().then((repository) => repository.listAttempts(playerId)),
      loadChunk('advice', () => import('./adviceEngine')),
    ])
      .then(([attempts, engine]) =>
        engine.adviceFor({
          attempts,
          finished: done,
          today: localDay(now()),
          ...(startAt ? { startAt } : {}),
          ...(leftOut ? { leftOut } : {}),
        }),
      )
      .then(
        (advice) => {
          if (current) setFound({ for: asked, advice });
        },
        (error: unknown) => {
          // A part of the game that could not be fetched has been written down already, where it failed.
          if (!(error instanceof ChunkLoadError)) recordError('storage', error);
          if (current) setFound({ for: asked, advice: null });
        },
      );
    return () => {
      current = false;
    };
    // Settings are read through the serialized selection because the profile is read afresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, asked, ready, done]);

  if (profiles.status !== 'ready') return { done, known: false, advice: null };
  if (playerId === null) return { done, known: true, advice: null };
  const settled = found !== null && found.for === asked;
  return { done, known: settled, advice: settled ? found.advice : null };
}
