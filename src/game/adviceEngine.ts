import { loadConceptGraph } from '@/content/concepts';
import { advise, type Advice } from '@/engine/recommend';
import type { Attempt, WorldId } from '@/engine/schema';

/**
 * The part of the game that works out what to offer next. It is fetched when a page first asks, with the concept
 * graph it goes by, so that neither is in what every visit downloads before anything is on the screen.
 */

export interface Asked {
  /** Every answer recorded for the player. */
  attempts: readonly Attempt[];
  /** The activities they have finished at least once. */
  finished: ReadonlySet<string>;
  /** The day it is on this device, `YYYY-MM-DD`. */
  today: string;
  /** Where a grown-up has chosen for Play to begin, by world. */
  startAt?: Partial<Record<WorldId, string>>;
}

export async function adviceFor(asked: Asked): Promise<Advice> {
  const graph = await loadConceptGraph();
  return advise({
    graph,
    attempts: asked.attempts,
    finished: asked.finished,
    today: asked.today,
    ...(asked.startAt ? { startAt: asked.startAt } : {}),
  });
}
