import { parseContentPack, type ContentPack, type Lesson, type WorldId } from '@/engine';

/**
 * Authored curriculum, one versioned pack per world, loaded only when that world is entered.
 *
 * Packs are plain JSON so they stay declarative and reviewable. They are validated when loaded: a pack that does not
 * match the schema is refused, never half-used.
 */

export class ContentError extends Error {
  override name = 'ContentError';
}

/** Worlds that have authored content. A world without an entry has nothing to play yet. */
const PACK_LOADERS: Partial<Record<WorldId, () => Promise<{ default: unknown }>>> = {
  'number-garden': () => import('./packs/number-garden.v2.json'),
};

const loaded = new Map<WorldId, Promise<ContentPack>>();

export function hasPack(world: WorldId): boolean {
  return world in PACK_LOADERS;
}

export function loadPack(world: WorldId): Promise<ContentPack> {
  const cached = loaded.get(world);
  if (cached) return cached;

  const loader = PACK_LOADERS[world];
  if (!loader)
    return Promise.reject(new ContentError(`No content has been authored for ${world}.`));

  const pending = loader().then((module) => {
    const parsed = parseContentPack(module.default);
    if (!parsed.ok) {
      throw new ContentError(
        `The ${world} content pack is not valid: ${parsed.issues.slice(0, 3).join('; ')}`,
      );
    }
    if (parsed.value.world !== world) {
      throw new ContentError(`The ${world} loader returned a pack for ${parsed.value.world}.`);
    }
    return parsed.value;
  });
  // A failed load is not remembered, so a retry can succeed.
  pending.catch(() => loaded.delete(world));
  loaded.set(world, pending);
  return pending;
}

export function findLesson(pack: ContentPack, lessonId: string): Lesson | null {
  return pack.lessons.find((lesson) => lesson.id === lessonId) ?? null;
}

/** The English text for a string key; the key itself if the pack does not define it. */
export function packText(pack: ContentPack, key: string): string {
  return pack.strings.en[key] ?? key;
}
