/** The files that decide what the fallback pictures look like, as patterns relative to the repository root. */
export const SPRITE_SOURCES: string[];

/** A hash of those files' contents. */
export function sourceHash(root: string): string;
