import type { CSSProperties } from 'react';
import type { Command } from '@/engine';
import type { Game } from './run';
import styles from './robotRidge.module.css';

/**
 * Robot Ridge's drawings: the robot, the ground it drives on, the rocks in its way, the river and the bridge over
 * it, the star it is going to, and the arrows it is told with. All drawn here, by hand, as shapes; nothing is a
 * picture file.
 *
 * The robot is seen from above, like a toy on the floor, because which way it is facing is the whole of the game:
 * its eyes, its light and the ball on its aerial are all at its front, and turning it on the screen turns all of
 * them. It is drawn facing up the screen and turned from there.
 */

const INK = '#22304f';
const BLUE = '#62b4f3';
const BLUE_DEEP = '#2a6fb5';
const SUN = '#ffd35c';
const WATER = '#bfe4fa';
const PLANK = '#dba76c';
const PLANK_DEEP = '#a8733b';

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

/** A bridge as it is to be drawn. */
export interface BridgeShown {
  at: readonly [number, number];
  /** It lies across the screen, for a robot going left or right, or down it. */
  lies: 'across' | 'down';
  /**
   * Up, down, or not known yet. Before a run begins nobody knows which it will be, and it is drawn going up and
   * down (or, where nothing moves, half open).
   */
  state: 'up' | 'down' | 'maybe';
}

export interface SceneProps {
  columns: number;
  rows: number;
  goal: readonly [number, number];
  rocks: readonly (readonly [number, number])[];
  /** Squares of water, and the bridges over it. */
  water?: readonly (readonly [number, number])[];
  bridges?: readonly BridgeShown[];
  robot: Standing;
  /** The robot is waiting for a bridge to come down. */
  waiting?: boolean;
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
   * steps; a step and "again"; a row with one step that is not right; two rows of steps, for a long way; a row
   * with the step that waits in it. For a picture of an activity, not the board.
   */
  strip?: Game;
  className?: string;
}

const LOOP = ['M38 24a14 14 0 1 1-4.500-10.300', 'M35.500 4.500v10h-10'];

const STRIPS: Record<Game, { tiles: (Command | 'again')[]; wrong?: number; perRow?: number }> = {
  live: { tiles: ['forward'] },
  plan: { tiles: ['forward', 'right', 'forward'] },
  again: { tiles: ['forward', 'again'] },
  mend: { tiles: ['forward', 'left', 'forward'], wrong: 1 },
  long: { tiles: ['forward', 'right', 'forward', 'forward', 'left', 'forward'], perRow: 3 },
  bridge: { tiles: ['forward', 'wait', 'forward'] },
};

const STRIP_TILE = 52;
const STRIP_GAP = 10;
/** The room left above the tiles under a ground and below them, and between a ground and the tiles beside it. */
const STRIP_ABOVE = 12;
const STRIP_BELOW = 10;
const STRIP_ASIDE = 22;

const tilesAcross = (game: Game): number => STRIPS[game].perRow ?? STRIPS[game].tiles.length;

/** How wide a game's tiles are, and how high: a long way's are in two rows. */
const stripSpan = (game: Game): number => {
  const across = tilesAcross(game);
  return across * STRIP_TILE + (across - 1) * STRIP_GAP;
};
const stripRise = (game: Game): number => {
  const lines = Math.ceil(STRIPS[game].tiles.length / tilesAcross(game));
  return lines * STRIP_TILE + (lines - 1) * STRIP_GAP;
};

/** The small tiles that go with a picture of a journey, with their top left corner at (`left`, `top`). */
function Strip({ game, left, top }: { game: Game; left: number; top: number }) {
  const { tiles, wrong } = STRIPS[game];
  const across = tilesAcross(game);
  return (
    <g transform={`translate(${String(left)} ${String(top)})`}>
      {tiles.map((tile, index) => {
        const again = tile === 'again';
        const marked = wrong === index;
        const x = (index % across) * (STRIP_TILE + STRIP_GAP);
        const y = Math.floor(index / across) * (STRIP_TILE + STRIP_GAP);
        return (
          <g key={index} transform={`translate(${String(x)} ${String(y)})`}>
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

const WAVE = 'q9-9 18 0t18 0 18 0 18 0';

/** One square of water, with its top left corner at (0, 0): squares side by side run together as a river. */
function Water() {
  return (
    <>
      <rect width={CELL} height={CELL} fill={WATER} />
      <g fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.85">
        <path d={`M14 36${WAVE}`} />
        <path d={`M14 68${WAVE}`} />
      </g>
    </>
  );
}

/**
 * A bridge, drawn round (0, 0) lying across: two leaves of planks, one from each bank. Down, they meet in the
 * middle. Up, each is drawn back to its bank and there is open water between them, which is what says that there
 * is no way over. (How far they are drawn back is the stylesheet's, so that they move.)
 */
function Bridge({ state }: { state: BridgeShown['state'] }) {
  const leaf = (side: 'Left' | 'Right') => {
    const from = side === 'Left' ? -50 : 0;
    return (
      <g className={side === 'Left' ? styles.leafLeft : styles.leafRight}>
        <rect x={from} y="-27" width="50" height="54" fill={PLANK} />
        <path
          d={[12, 25, 38].map((x) => `M${String(from + x)}-27v54`).join('')}
          stroke={PLANK_DEEP}
          strokeWidth="3"
        />
        <path
          d={`M${String(from)}-27h50M${String(from)} 27h50`}
          stroke={PLANK_DEEP}
          strokeWidth="6"
        />
      </g>
    );
  };
  return (
    <g className={styles.bridge} data-state={state}>
      {leaf('Left')}
      {leaf('Right')}
    </g>
  );
}

/** The ground, the rocks, the water, the star and the robot. It moves when what it is given changes. */
export function Scene({
  columns,
  rows,
  goal,
  rocks,
  water = [],
  bridges = [],
  robot,
  waiting = false,
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
  const [robotX, robotY] = middle(robot.at);
  const ground = { width: columns * CELL, height: rows * CELL };
  // The tiles go under a ground of one row and beside a taller one. A picture of a journey is shown small, in a
  // place wider than it is tall; tiles under a tall ground would make the whole of it smaller still.
  const span = strip ? stripSpan(strip) : 0;
  const rise = strip ? stripRise(strip) : 0;
  const aside = strip !== undefined && rows > 1;
  const width = ground.width + 8 + (aside ? STRIP_ASIDE + span : 0);
  const height = ground.height + 8 + (strip && !aside ? STRIP_ABOVE + rise + STRIP_BELOW : 0);
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

      {[...water, ...bridges.map((bridge) => bridge.at)].map(([column, row]) => (
        <g
          key={`water-${String(column)}-${String(row)}`}
          transform={`translate(${String(column * CELL)} ${String(row * CELL)})`}
        >
          <Water />
        </g>
      ))}
      {bridges.map((bridge) => {
        const [x, y] = middle(bridge.at);
        return (
          <g
            key={`bridge-${String(bridge.at[0])}-${String(bridge.at[1])}`}
            transform={`translate(${String(x)} ${String(y)})${bridge.lies === 'down' ? ' rotate(90)' : ''}`}
          >
            <Bridge state={bridge.state} />
          </g>
        );
      })}

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

      {/* Waiting: three dots over the robot, the same three that are on the step that waits. */}
      {waiting && (
        <g
          className={styles.waiting}
          transform={`translate(${String(robotX)} ${String(robotY - 40)})`}
        >
          <rect
            x="-25"
            y="-11"
            width="50"
            height="22"
            rx="11"
            fill="#ffffff"
            stroke={INK}
            strokeWidth="3"
          />
          <circle cx="-12" r="4" fill={INK} />
          <circle r="4" fill={INK} />
          <circle cx="12" r="4" fill={INK} />
        </g>
      )}

      {strip && (
        <Strip
          game={strip}
          left={aside ? ground.width + STRIP_ASIDE : (ground.width - span) / 2}
          top={aside ? (ground.height - rise) / 2 : ground.height + STRIP_ABOVE}
        />
      )}
    </svg>
  );
}

/** A dot, as a path: a small ring that the thick line of these pictures fills in. */
const dot = (x: number) => `M${String(x - 2)} 24a2 2 0 1 0 4 0a2 2 0 1 0-4 0`;

const ARROWS: Record<Command, string[]> = {
  forward: ['M24 40V11', 'M11.500 22 24 9.500 36.500 22'],
  left: ['M33 40V25a9 9 0 0 0-9-9h-9', 'M22.500 6.500 13 16l9.500 9.500'],
  right: ['M15 40V25a9 9 0 0 1 9-9h9', 'M25.500 6.500 35 16l-9.500 9.500'],
  // Waiting is three dots: what a screen shows while something is on its way.
  wait: [dot(9.5), dot(24), dot(38.5)],
};

/**
 * A command as a picture: an arrow straight on, an arrow that bends the way the robot turns, or three dots for the
 * step that waits.
 */
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

/** One step on, or one step back: the triangle of "go" and a bar it stops at. */
export function StepArrow({ back = false, className }: { back?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <g transform={back ? 'translate(48 0) scale(-1 1)' : undefined}>
        <path d="M11 12v24l19-12z" />
        <path d="M38 11v26" fill="none" />
      </g>
    </svg>
  );
}

/** Take the last step out: a tile with its corner to the left and a cross on it. */
export function TakeOut({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19 11h20a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H19L6 24z" />
      <path d="M23.500 18.500l11 11M34.500 18.500l-11 11" />
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
