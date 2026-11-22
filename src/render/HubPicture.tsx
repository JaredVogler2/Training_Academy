import { PLACES, project, type Frame, type PlaceId, type Spot } from './archipelago';
import { SPRITE_PIXELS_PER_UNIT, spriteFile } from './spriteFiles';
import type { SpriteId } from './sprites';
import styles from './HubPicture.module.css';

/**
 * The archipelago as a picture: what the hub shows first, and keeps wherever real-time 3D is not available.
 *
 * Every island here is a rendering of the same model the 3D scene uses (scripts/render-sprites.mjs), placed by the
 * same arithmetic (archipelago.ts), so when the 3D scene fades in over the picture nothing moves. The sea is a
 * gradient matched to the 3D water; the boats bob and the clouds drift with a few steps of CSS, which costs a
 * software-rendered device almost nothing.
 */

function Sprite({
  id,
  at,
  frame,
  className,
  lifted = false,
  flipped = false,
  size = 1,
}: {
  id: SpriteId;
  at: Spot;
  frame: Frame;
  className?: string;
  lifted?: boolean;
  flipped?: boolean;
  size?: number;
}) {
  const sprite = spriteFile(id);
  if (!sprite) return null;
  const k = (frame.scale / SPRITE_PIXELS_PER_UNIT) * size;
  const anchor = project(frame, at.x, 0, at.z);
  return (
    <span
      className={[styles.sprite, className].filter(Boolean).join(' ')}
      data-sprite={id}
      data-anchor={`${String(Math.round(anchor.x))},${String(Math.round(anchor.y))}`}
      data-lifted={lifted || undefined}
      style={{
        left: anchor.x - sprite.anchorX * k,
        top: anchor.y - sprite.anchorY * k,
        width: sprite.width * k,
        height: sprite.height * k,
      }}
    >
      <img
        src={sprite.url}
        alt=""
        width={sprite.width}
        height={sprite.height}
        draggable={false}
        decoding="async"
        data-flipped={flipped || undefined}
      />
    </span>
  );
}

/** Where the glints lie, as fractions of the stage: fixed, so the picture is the same on every visit. */
const GLINTS: readonly (readonly [number, number, number])[] = [
  [0.07, 0.3, 1.0],
  [0.22, 0.86, 1.2],
  [0.36, 0.12, 0.9],
  [0.47, 0.62, 1.1],
  [0.58, 0.93, 1.0],
  [0.71, 0.2, 1.2],
  [0.84, 0.72, 0.9],
  [0.94, 0.44, 1.1],
  [0.15, 0.55, 0.8],
  [0.64, 0.42, 0.8],
];

export function HubPicture({
  frame,
  lifted,
  still,
}: {
  frame: Frame;
  lifted: PlaceId | null;
  still: boolean;
}) {
  const { spots, extras } = frame.layout;
  // Far islands first, so a nearer one is drawn over the water of the one behind it.
  const places = [...PLACES].sort((a, b) => spots[a].z - spots[b].z);
  return (
    <div
      className={styles.sea}
      data-testid="hub-picture"
      data-arrangement={frame.layout.arrangement}
      data-still={still || undefined}
    >
      {GLINTS.map(([x, y, size], index) => (
        <span
          key={index}
          className={styles.glint}
          style={{
            left: `${String(x * 100)}%`,
            top: `${String(y * 100)}%`,
            width: Math.max(8, frame.scale * 0.32 * size),
            // Whole seconds, so every glint changes on the picture's shared beat.
            animationDelay: `${String(-index)}s`,
          }}
        />
      ))}
      {extras.rocks.map((rock, index) => (
        <Sprite key={`rock-${String(index)}`} id="rock" at={rock} frame={frame} />
      ))}
      {places.map((place) => (
        <Sprite key={place} id={place} at={spots[place]} frame={frame} lifted={lifted === place} />
      ))}
      {extras.boats.map((boat, index) => (
        <Sprite
          key={`boat-${String(index)}`}
          id={`boat-${String(index % 3)}` as SpriteId}
          at={boat}
          frame={frame}
          className={styles.boat}
          flipped={index % 2 === 1}
        />
      ))}
      {extras.clouds.map((cloud, index) => (
        <Sprite
          key={`cloud-${String(index)}`}
          id="cloud"
          at={cloud}
          frame={frame}
          className={styles.cloud}
          size={0.92 + (index % 3) * 0.14}
        />
      ))}
    </div>
  );
}
