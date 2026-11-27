import { parseConceptGraph, type ConceptGraph } from '@/engine/graph';
import { ContentError } from './index';

/**
 * The concept graph: what is taught, what each skill builds on and which activity teaches it. It is what the game
 * goes by to decide what to offer next, and it is fetched by itself, a few thousand bytes, so that a page can say
 * where Play goes without fetching a single lesson. (`npm run content` writes it from the packs, and
 * tests/content/concepts.test.ts holds it to them.)
 *
 * Like a pack, it is checked when it arrives: one that is not a graph is refused, never half-used.
 */
let loaded: Promise<ConceptGraph> | null = null;

export function loadConceptGraph(): Promise<ConceptGraph> {
  if (loaded) return loaded;
  const pending = import('./concepts.json').then((module) => {
    const parsed = parseConceptGraph(module.default);
    if (!parsed.ok) {
      throw new ContentError(
        `The concept graph is not valid: ${parsed.issues.slice(0, 3).join('; ')}`,
      );
    }
    return parsed.value;
  });
  // A failed fetch is not remembered, so that another try can succeed.
  pending.catch(() => {
    if (loaded === pending) loaded = null;
  });
  loaded = pending;
  return pending;
}
