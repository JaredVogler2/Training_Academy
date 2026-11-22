import manifest from '@/assets/hub/sprites.json';
import type { SpriteId } from './sprites';

/**
 * The hub's pictures as the page can use them: the address of each (hashed by the build), its size, and the point
 * in it that is the thing's own middle at water level.
 */

const urls = import.meta.glob<string>('../assets/hub/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

export interface SpriteFile {
  url: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

interface SpriteRecord {
  file: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

const records = manifest.sprites as Readonly<Record<SpriteId, SpriteRecord>>;

/** Pixels of a picture to one world unit. */
export const SPRITE_PIXELS_PER_UNIT: number = manifest.pixelsPerUnit;

export function spriteFile(id: SpriteId): SpriteFile | null {
  const record = records[id];
  const url = urls[`../assets/hub/${record.file}`];
  if (!url) return null;
  return {
    url,
    width: record.width,
    height: record.height,
    anchorX: record.anchorX,
    anchorY: record.anchorY,
  };
}
