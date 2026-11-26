import type { Command, Facing, ProgramTask } from '@/engine';

/**
 * The ways to the star, found by walking the ground and not by trying programs.
 *
 * The engine finds the shortest program by trying every program in order of length (src/engine/robot.ts), which
 * is certain and slow. This goes outwards from where the robot stands, one command at a time, over the places it
 * can be: which square, facing which way, with which bridges down. It is other code, and it is quick, so it does
 * two jobs: it lets a journey be drawn from a seed (thousands of grounds are looked at to find one that is as
 * long as was asked for), and it is the second opinion on every journey's length. An answer worked out twice,
 * by different means, is an answer checked.
 *
 * It is for programs that are done once. A program done over is not a walk over places.
 */

const FACINGS: readonly Facing[] = ['north', 'east', 'south', 'west'];
const STEP: Record<Facing, readonly [number, number]> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};

export interface Ways {
  /** How many commands the shortest program has. */
  steps: number;
  /** How many different programs are that short. */
  count: number;
  /** One of them: the first found, taking the commands in the order the task offers them. */
  one: Command[];
}

/**
 * The shortest way to the star with every bridge up, and how many ways are as short. `null` where there is no
 * way at all within `most` commands.
 */
export function shortestWays(task: ProgramTask, most = 24): Ways | null {
  const { columns, rows } = task.grid;
  const key = (column: number, row: number) => `${String(column)},${String(row)}`;
  const rocks = new Set(task.rocks.map(([column, row]) => key(column, row)));
  const water = new Set((task.water ?? []).map(([column, row]) => key(column, row)));
  const bridges = (task.bridges ?? []).map(([column, row]) => key(column, row));

  interface Place {
    column: number;
    row: number;
    facing: number;
    /** Which bridges are still up, as bits. */
    up: number;
  }
  const idOf = (place: Place) =>
    ((place.row * columns + place.column) * 4 + place.facing) * 4 + place.up;
  const start: Place = {
    column: task.start.at[0],
    row: task.start.at[1],
    facing: FACINGS.indexOf(task.start.facing),
    up: (1 << bridges.length) - 1,
  };

  /** Where a command leads from a place: a new place, the star, or nowhere (the robot is stopped, or nothing changes). */
  const after = (place: Place, command: Command): Place | 'star' | null => {
    if (command === 'left' || command === 'right') {
      return { ...place, facing: (place.facing + (command === 'right' ? 1 : 3)) % 4 };
    }
    const [dx, dy] = STEP[FACINGS[place.facing] ?? 'north'];
    const column = place.column + dx;
    const row = place.row + dy;
    const bridge = bridges.indexOf(key(column, row));
    const raised = bridge >= 0 && (place.up & (1 << bridge)) !== 0;
    if (command === 'wait') return raised ? { ...place, up: place.up & ~(1 << bridge) } : null;
    if (column < 0 || row < 0 || column >= columns || row >= rows) return null;
    if (rocks.has(key(column, row)) || water.has(key(column, row)) || raised) return null;
    if (column === task.goal[0] && row === task.goal[1]) return 'star';
    return { ...place, column, row };
  };

  // Outwards, a command at a time. For each place: how many shortest programs lead to it, and one of them.
  let edge = new Map<number, { place: Place; count: number; one: Command[] }>([
    [idOf(start), { place: start, count: 1, one: [] }],
  ]);
  const seen = new Set<number>(edge.keys());
  for (let steps = 1; steps <= most && edge.size > 0; steps++) {
    const next = new Map<number, { place: Place; count: number; one: Command[] }>();
    let arrived: { count: number; one: Command[] } | null = null;
    for (const { place, count, one } of edge.values()) {
      for (const command of task.commands) {
        const reached = after(place, command);
        if (reached === null) continue;
        if (reached === 'star') {
          arrived = arrived
            ? { count: arrived.count + count, one: arrived.one }
            : { count, one: [...one, command] };
          continue;
        }
        const id = idOf(reached);
        if (seen.has(id)) continue;
        const already = next.get(id);
        if (already) already.count += count;
        else next.set(id, { place: reached, count, one: [...one, command] });
      }
    }
    if (arrived) return { steps, count: arrived.count, one: arrived.one };
    for (const id of next.keys()) seen.add(id);
    edge = next;
  }
  return null;
}
