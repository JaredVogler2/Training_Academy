import type { PlaceId } from './extents';
import { spriteFile } from './spriteFiles';
import styles from './IslandPicture.module.css';

/**
 * One island, seen through a round window of sea: the same picture the hub shows, for a world's own page.
 * Decoration: the page's heading names the world.
 */
export function IslandPicture({ place, className }: { place: PlaceId; className?: string }) {
  const sprite = spriteFile(place);
  if (!sprite) return null;
  // The picture is wider than the window, so the island fills it; its middle sits a little below the window's.
  const width = 150;
  const height = (width * sprite.height) / sprite.width;
  return (
    <span className={[styles.porthole, className].filter(Boolean).join(' ')} data-island={place}>
      <img
        src={sprite.url}
        alt=""
        width={sprite.width}
        height={sprite.height}
        draggable={false}
        decoding="async"
        style={{
          width: `${String(width)}%`,
          left: `${String(50 - (sprite.anchorX / sprite.width) * width)}%`,
          top: `${String(63 - (sprite.anchorY / sprite.height) * height)}%`,
        }}
      />
    </span>
  );
}
