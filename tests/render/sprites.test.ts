import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import manifest from '@/assets/hub/sprites.json';
import { SPRITE_IDS, isPlaceId, isSpriteId, spriteBox } from '@/render/sprites';
import { sourceHash } from '../../scripts/sprite-sources.mjs';

/**
 * The pictures the hub falls back to are rendered from the 3D models and committed. Nothing can re-render them in
 * a unit test, but these checks keep the committed set honest: complete, the right sizes, not too heavy, and not
 * left behind when a model changes.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const folder = join(root, 'src/assets/hub');
const sprites = manifest.sprites as Record<
  string,
  { file: string; width: number; height: number; anchorX: number; anchorY: number }
>;

describe('the fallback pictures', () => {
  it('were rendered from the models as they are now', () => {
    expect(
      manifest.source,
      'The models, materials or water have changed since the pictures in src/assets/hub were rendered. Run: npm run build && npm run art:sprites',
    ).toBe(sourceHash(root));
  });

  it('are one for every island and every floating thing, and nothing else', () => {
    expect(Object.keys(sprites).sort()).toEqual([...SPRITE_IDS].sort());
    for (const id of SPRITE_IDS) {
      expect(existsSync(join(folder, sprites[id]?.file ?? 'missing')), id).toBe(true);
    }
  });

  it('are the size and have the anchor that the page will place them by', () => {
    for (const id of SPRITE_IDS) {
      const sprite = sprites[id];
      const box = spriteBox(id);
      if (!sprite) throw new Error(`No picture for ${id}.`);
      expect(Math.abs(sprite.width - box.width * manifest.pixelsPerUnit), id).toBeLessThanOrEqual(
        1,
      );
      expect(Math.abs(sprite.height - box.height * manifest.pixelsPerUnit), id).toBeLessThanOrEqual(
        1,
      );
      expect(sprite.anchorX, id).toBeCloseTo(box.anchorX * manifest.pixelsPerUnit, 1);
      expect(sprite.anchorY, id).toBeCloseTo(box.anchorY * manifest.pixelsPerUnit, 1);
    }
  });

  it('weigh little enough to be the first thing on screen', () => {
    let total = 0;
    for (const id of SPRITE_IDS) {
      const bytes = statSync(join(folder, sprites[id]?.file ?? '')).size;
      // An island is a few dozen kilobytes; anything much larger was saved wrongly.
      expect(bytes, id).toBeLessThan(isPlaceId(id) ? 60_000 : 20_000);
      expect(bytes, id).toBeGreaterThan(500);
      total += bytes;
    }
    expect(total).toBeLessThan(340_000);
  });

  it('knows a sprite name from any other word', () => {
    expect(isSpriteId('academy')).toBe(true);
    expect(isSpriteId('boat-2')).toBe(true);
    expect(isSpriteId('guide')).toBe(false);
    expect(isPlaceId('cloud')).toBe(false);
  });
});
