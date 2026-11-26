import { useMemo, type CSSProperties } from 'react';
import atlas from '@/content/explorer-harbor/atlas.json';
import {
  lineSeen,
  pathOf,
  seen,
  shapeOf,
  type LonLat,
  type View,
} from '@/content/explorer-harbor/globe';
import styles from './explorerHarbor.module.css';

/**
 * The globe: the real world, looked at from far away, with nothing written on it and no border on it. Its lands
 * are the seven continents' outlines (src/content/explorer-harbor/atlas.json), drawn as much of each as faces us.
 * It is a picture of numbers: turn the view and it is drawn again.
 */

const RINGS = atlas.continents as unknown as Readonly<Record<string, LonLat[][]>>;
export const LAND_KEYS: readonly string[] = Object.keys(RINGS);

/** The globe's radius, in the units of its own drawing. */
export const RADIUS = 100;
/** The drawing's box: the globe and a little room for its edge. */
const BOX = 104;
/** How much of its picture the ball is, from the middle to the edge. */
export const BALL = RADIUS / BOX;

/** A line of places round the globe, a few degrees apart. */
const lineOf = (place: (step: number) => LonLat, steps: number): LonLat[] =>
  Array.from({ length: steps + 1 }, (_, step) => place(step));

/** Lines of longitude and of latitude, every thirty degrees: what makes a turning disc look like a ball. */
const GRID: readonly LonLat[][] = [
  ...[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180].map((lon) =>
    lineOf((step): LonLat => [lon, -80 + step * 5], 32),
  ),
  ...[-60, -30, 0, 30, 60].map((lat) => lineOf((step): LonLat => [-180 + step * 6, lat], 60)),
];

/** Where a place is over the globe's picture, as a share of the picture's own box. */
export function placed(view: View, place: LonLat): CSSProperties {
  const at = seen(view, place);
  const share = (BALL / 2) * 100;
  return {
    left: `${(50 + at.x * share).toFixed(2)}%`,
    top: `${(50 + at.y * share).toFixed(2)}%`,
  };
}

export function Globe({
  view,
  lit = null,
  className,
}: {
  view: View;
  /** The land that is lit: the one that has been found, or is being pointed out. */
  lit?: string | null;
  className?: string;
}) {
  const { lon, lat } = view;
  const lands = useMemo(
    () => LAND_KEYS.map((land) => [land, pathOf({ lon, lat }, RINGS[land] ?? [], RADIUS)] as const),
    [lon, lat],
  );
  const grid = useMemo(
    () => GRID.map((each) => lineSeen({ lon, lat }, each, RADIUS)).join(''),
    [lon, lat],
  );
  return (
    <svg
      className={`${styles.globe ?? ''} ${className ?? ''}`}
      viewBox={`${String(-BOX)} ${String(-BOX)} ${String(2 * BOX)} ${String(2 * BOX)}`}
      aria-hidden="true"
      focusable="false"
      data-scene="globe"
      data-lon={lon.toFixed(1)}
      data-lat={lat.toFixed(1)}
    >
      {/* The ball stands a little proud of the page, as a card does. */}
      <circle r={RADIUS} cy={BOX - RADIUS - 1} className={styles.globeLip} />
      <circle r={RADIUS} className={styles.ocean} />
      <path d={grid} className={styles.grid} />
      {/* The land that is lit is drawn last, so that no other land lies over its edge. */}
      {[...lands]
        .sort(([a], [b]) => Number(a === lit) - Number(b === lit))
        .map(([land, d]) =>
          d === '' ? null : (
            <path
              key={land}
              d={d}
              className={styles.land}
              data-land={land}
              data-lit={lit === land}
            />
          ),
        )}
      {/* The light on a ball: a glint along its edge where the light falls, and a darker far edge. */}
      <path d="M-84 -37A92 92 0 0 1-37 -84" className={styles.shine} />
      <circle r={RADIUS - 3.5} className={styles.limb} />
      <circle r={RADIUS} className={styles.rim} />
    </svg>
  );
}

/**
 * The shape of one land by itself, as it looks from above its own middle: what a child is given to find. It is
 * drawn in one plain colour, so that it is its shape that is matched and not a colour. Which of a land's
 * outlines are in its shape, and why not all, is in `shapeOf`.
 */
export function LandShape({ land, className }: { land: string; className?: string }) {
  const drawn = useMemo(() => {
    const { outlines, box } = shapeOf(RINGS[land] ?? []);
    const d = outlines
      .map(
        (ring) =>
          `M${ring.map(([px, py]) => `${(px * 100).toFixed(1)} ${(py * 100).toFixed(1)}`).join('L')}Z`,
      )
      .join('');
    const viewBox = [box.x, box.y, box.side, box.side]
      .map((each) => (each * 100).toFixed(1))
      .join(' ');
    return { d, viewBox };
  }, [land]);
  return (
    <svg
      className={`${styles.landShape ?? ''} ${className ?? ''}`}
      viewBox={drawn.viewBox}
      aria-hidden="true"
      focusable="false"
      data-shape={land}
    >
      <path d={drawn.d} />
    </svg>
  );
}

/** What stands where the shape will be, in a question that is only heard: a sound, and nothing to match yet. */
export function Heard({ className }: { className?: string }) {
  return (
    <svg
      className={`${styles.heard ?? ''} ${className ?? ''}`}
      viewBox="-34 -34 68 68"
      aria-hidden="true"
      focusable="false"
      data-heard="true"
    >
      <rect
        x="-30"
        y="-30"
        width="60"
        height="60"
        rx="9"
        fill="rgb(255 255 255 / 55%)"
        stroke="currentColor"
        strokeWidth="2.400"
        strokeDasharray="5 5"
        strokeLinecap="round"
      />
      <path d="M-14-5h6l8-7v24l-8-7h-6z" fill="currentColor" />
      <path
        d="M6-6.500a9 9 0 0 1 0 13M11-12a16 16 0 0 1 0 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
