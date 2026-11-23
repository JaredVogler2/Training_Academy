import type { CSSProperties } from 'react';
import type { Command } from '@/engine';
import styles from './robotRidge.module.css';

/**
 * Robot Ridge's drawings: the robot, the ground it drives on, the rocks in its way, the star it is going to, and
 * the arrows it is told with. All drawn here, by hand, as shapes; nothing is a picture file.
 *
 * The robot is seen from above, like a toy on the floor, because which way it is facing is the whole of the game:
 * its eyes, its light and the ball on its aerial are all at its front, and turning it on the screen turns all of
 * them. It is drawn facing up the screen and turned from there.
 */

const INK = '#22304f';
const BLUE = '#62b4f3';
const BLUE_DEEP = '#2a6fb5';
const SUN = '#ffd35c';

/** One square of ground is this many units across. */
export const CELL = 100;

const middle = ([column, row]: readonly [number, number]): [number, number] => [
  column * CELL + CELL / 2,
  row * CELL + CELL / 2,
];

/** The robot, about 70 units across, drawn round (0, 0), facing up. */
function RobotShape({ ghost = false }: { ghost?: boolean }) {
  return (
    <>
      {!ghost && (
        <>
          <ellipse cx="3" cy="6" rx="34" ry="32" fill={INK} opacity="0.12" />
          {/* Its light, on the ground ahead: forward is that way. */}
          <path d="M-13-33-25-62Q0-73 25-62L13-33z" fill={SUN} opacity="0.3" />
        </>
      )}
      <rect x="-38" y="-19" width="13" height="42" rx="6.500" fill={INK} />
      <rect x="25" y="-19" width="13" height="42" rx="6.500" fill={INK} />
      <rect x="-28" y="-30" width="56" height="62" rx="20" fill={BLUE} />
      <path d="M-28 8h56v4c0 11-9 20-20 20h-16c-11 0-20-9-20-20z" fill="#4a9de0" />
      <rect x="-10" y="14" width="20" height="9" rx="4.500" fill={BLUE_DEEP} opacity="0.55" />
      <rect x="-21" y="-25" width="42" height="27" rx="12" fill="#f3fbff" />
      <circle cx="-9" cy="-12" r="6.500" fill={INK} />
      <circle cx="9" cy="-12" r="6.500" fill={INK} />
      <circle cx="-7" cy="-14.500" r="2" fill="#ffffff" />
      <circle cx="11" cy="-14.500" r="2" fill="#ffffff" />
      <path d="M0-30v-9" stroke={BLUE_DEEP} strokeWidth="3.400" strokeLinecap="round" />
      <circle cx="0" cy="-41" r="5" fill={SUN} />
    </>
  );
}

const STAR =
  'M0-26 6.500-8.900 24.700-8 10.500 3.400 15.300 21 0 11-15.300 21-10.500 3.400-24.700-8-6.500-8.900z';

export interface Standing {
  at: readonly [number, number];
  /** How far the robot is turned from facing up the screen, in degrees; it may be more than a full turn. */
  degrees: number;
}

export interface SceneProps {
  columns: number;
  rows: number;
  goal: readonly [number, number];
  rocks: readonly (readonly [number, number])[];
  robot: Standing;
  /** The robot's shadow, showing the way: where it would be. */
  ghost?: Standing | null;
  /** Squares to mark as passed over. */
  trail?: readonly (readonly [number, number])[];
  /** The robot has just been stopped by a rock or the edge. Give a new `bumpKey` for each time it happens. */
  bumped?: boolean;
  bumpKey?: string | number;
  /** The robot is on the star. */
  won?: boolean;
  /**
   * With the ground, a few small tiles that say which game this journey is for: one arrow to tap; a row of
   * steps; a step and "again"; a row with one step that is not right. For a picture of an activity, not the board.
   */
  strip?: 'live' | 'plan' | 'again' | 'mend';
  className?: string;
}

const LOOP = ['M38 24a14 14 0 1 1-4.500-10.300', 'M35.500 4.500v10h-10'];

const STRIPS: Record<
  NonNullable<SceneProps['strip']>,
  { tiles: (Command | 'again')[]; wrong?: number }
> = {
  live: { tiles: ['forward'] },
  plan: { tiles: ['forward', 'right', 'forward'] },
  again: { tiles: ['forward', 'again'] },
  mend: { tiles: ['forward', 'left', 'forward'], wrong: 1 },
};

const STRIP_TILE = 52;
const STRIP_GAP = 10;
/** The room the tiles take under a ground, and the room left between a ground and the tiles beside it. */
const STRIP_UNDER = 74;
const STRIP_ASIDE = 22;

/** How wide a game's row of tiles is. */
const stripSpan = (game: NonNullable<SceneProps['strip']>): number => {
  const { length } = STRIPS[game].tiles;
  return length * STRIP_TILE + (length - 1) * STRIP_GAP;
};

/** The small tiles that go with a picture of a journey, with their top left corner at (`left`, `top`). */
function Strip({
  game,
  left,
  top,
}: {
  game: NonNullable<SceneProps['strip']>;
  left: number;
  top: number;
}) {
  const { tiles, wrong } = STRIPS[game];
  return (
    <g transform={`translate(${String(left)} ${String(top)})`}>
      {tiles.map((tile, index) => {
        const again = tile === 'again';
        const marked = wrong === index;
        return (
          <g key={index} transform={`translate(${String(index * (STRIP_TILE + STRIP_GAP))} 0)`}>
            {!again && (
              <rect
                width={STRIP_TILE}
                height={STRIP_TILE}
                rx="13"
                fill={marked ? '#eef1ff' : '#ffffff'}
                stroke={marked ? '#5a6fd0' : '#ffffff'}
                strokeWidth="3"
                strokeDasharray={marked ? '7 6' : undefined}
              />
            )}
            <g
              transform="translate(8 8) scale(0.75)"
              fill="none"
              stroke={again ? BLUE_DEEP : INK}
              strokeWidth="6.500"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {(again ? LOOP : ARROWS[tile]).map((path) => (
                <path key={path} d={path} />
              ))}
            </g>
          </g>
        );
      })}
    </g>
  );
}

const standing = ({ at, degrees }: Standing): CSSProperties => {
  const [x, y] = middle(at);
  return { transform: `translate(${String(x)}px, ${String(y)}px) rotate(${String(degrees)}deg)` };
};

/** The ground, the rocks, the star and the robot. It moves when what it is given changes. */
export function Scene({
  columns,
  rows,
  goal,
  rocks,
  robot,
  ghost = null,
  trail = [],
  bumped = false,
  bumpKey = 0,
  won = false,
  strip,
  className,
}: SceneProps) {
  const cells: [number, number][] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) cells.push([column, row]);
  }
  const [goalX, goalY] = middle(goal);
  const ground = { width: columns * CELL, height: rows * CELL };
  // The tiles go under a ground of one row and beside a taller one. A picture of a journey is shown small, in a
  // place wider than it is tall; tiles under a tall ground would make the whole of it smaller still.
  const span = strip ? stripSpan(strip) : 0;
  const aside = strip !== undefined && rows > 1;
  const width = ground.width + 8 + (aside ? STRIP_ASIDE + span : 0);
  const height = ground.height + 8 + (strip && !aside ? STRIP_UNDER : 0);
  return (
    <svg
      className={[styles.scene, className].filter(Boolean).join(' ')}
      viewBox={`-4 -4 ${String(width)} ${String(height)}`}
      aria-hidden="true"
      focusable="false"
      data-won={won || undefined}
    >
      {cells.map(([column, row]) => (
        <rect
          key={`${String(column)}-${String(row)}`}
          x={column * CELL + 4}
          y={row * CELL + 4}
          width={CELL - 8}
          height={CELL - 8}
          rx="18"
          fill={(column + row) % 2 === 0 ? '#f4faff' : '#e6f2ff'}
          stroke="#ffffff"
          strokeWidth="3"
        />
      ))}

      {trail.map((cell) => {
        const [x, y] = middle(cell);
        return (
          <circle
            key={`${String(cell[0])}-${String(cell[1])}`}
            className={styles.footprint}
            cx={x}
            cy={y}
            r="9"
            fill={BLUE_DEEP}
            opacity="0.3"
          />
        );
      })}

      <g transform={`translate(${String(goalX)} ${String(goalY)})`}>
        <circle r="35" fill="#fff3c4" />
        <g className={styles.star}>
          <path d={STAR} fill="#ffcf4a" stroke="#c88a00" strokeWidth="3" strokeLinejoin="round" />
        </g>
      </g>

      {rocks.map((rock) => {
        const [x, y] = middle(rock);
        return (
          <g
            key={`${String(rock[0])}-${String(rock[1])}`}
            transform={`translate(${String(x)} ${String(y)})`}
          >
            <ellipse cx="0" cy="27" rx="30" ry="6" fill={INK} opacity="0.12" />
            <path
              d="M-31 17c-5-15 2-32 17-36 13-4 31 0 35 15 3 11 0 23-10 27-13 5-38 5-42-6z"
              fill="#9aa6bd"
            />
            <path
              d="M-17-8c4-8 12-12 21-11"
              fill="none"
              stroke="#c9d1e0"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx="23" cy="19" r="8" fill="#8792ac" />
          </g>
        );
      })}

      {ghost && (
        <g className={styles.ghost} style={standing(ghost)}>
          <RobotShape ghost />
        </g>
      )}

      <g className={styles.robot} style={standing(robot)}>
        {/* Re-keyed for each bump, so that each one is its own small nudge. */}
        <g key={bumped ? `bump-${String(bumpKey)}` : 'steady'} data-bumped={bumped || undefined}>
          {bumped && (
            <path
              d="M-16-50-22-60M0-53v-12M16-50 22-60"
              className={styles.knock}
              fill="none"
              stroke={INK}
              strokeWidth="4"
              strokeLinecap="round"
            />
          )}
          <g className={styles.body}>
            <RobotShape />
          </g>
        </g>
      </g>

      {strip && (
        <Strip
          game={strip}
          left={aside ? ground.width + STRIP_ASIDE : (ground.width - span) / 2}
          top={aside ? (ground.height - STRIP_TILE) / 2 : ground.height + 12}
        />
      )}
    </svg>
  );
}

const ARROWS: Record<Command, string[]> = {
  forward: ['M24 40V11', 'M11.500 22 24 9.500 36.500 22'],
  left: ['M33 40V25a9 9 0 0 0-9-9h-9', 'M22.500 6.500 13 16l9.500 9.500'],
  right: ['M15 40V25a9 9 0 0 1 9-9h9', 'M25.500 6.500 35 16l-9.500 9.500'],
};

/** A command as a picture: an arrow straight on, or an arrow that bends the way the robot turns. */
export function Arrow({ command, className }: { command: Command; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="6.500"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-command={command}
    >
      {ARROWS[command].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

/** "Do it again": an arrow that comes back round to where it began. */
export function Loop({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="5.500"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {LOOP.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
