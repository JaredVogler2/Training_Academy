import type { DesignTask } from './schema';

/**
 * Small models of real things, for the workbenches of Inventor Island: what happens when a design is tested. Each is
 * a pure function of what is fixed and what was chosen, so that the same design always does the same thing — a
 * child who changes one part sees what that one change did.
 *
 * They are models, and simple ones: right about which way a change pushes (thicker holds more, steeper rolls
 * further), not about how much. Each says below what it assumes and what it leaves out; none of them is a
 * simulation of the real thing, and the game never says it is.
 *
 * A set-up is written as one flat record: what a challenge fixes (`given`) and what the child has chosen (`choice`).
 * A value that is chosen wins over one that is given, so the same record describes a design half-built, the design
 * a challenge starts from, and a finished one.
 */

export interface TestResult {
  /** The design does what it was meant to. */
  works: boolean;
  /** What happened, in a word the workbench can draw and the record can keep: "held", "sagged". */
  outcome: string;
}

export type Setup = Readonly<Record<string, string | number>>;

export type Model = (given: Setup, choice: Readonly<Record<string, string>>) => TestResult;

/** The value a set-up has for one of its parts: what was chosen, or else what was given. */
function part(given: Setup, choice: Readonly<Record<string, string>>, id: string): string {
  return String(choice[id] ?? given[id] ?? '');
}

// ---------------------------------------------------------------------------------------------------------------------
// The bridge
// ---------------------------------------------------------------------------------------------------------------------

/** Who has to cross, and how hard each presses down. */
export const TRAVELLERS: Readonly<Record<string, number>> = { rabbit: 1, goat: 2, bear: 3 };
/** How much each plank can carry across one length without a post under it. */
export const PLANKS: Readonly<Record<string, number>> = { thin: 1, thick: 2 };
export const POSTS: Readonly<Record<string, number>> = { none: 0, one: 1, two: 2 };
/** How wide the gap may be, in lengths. */
export const GAPS: readonly number[] = [2, 3, 4];

/**
 * A plank laid across a gap, with a traveller walking over it.
 *
 *   given    gap: 2, 3 or 4 lengths;  traveller: "rabbit", "goat" or "bear"
 *   choice   plank: "thin" or "thick";  posts: "none", "one" or "two" (stood evenly under the plank)
 *
 * The rule. Posts cut the gap into equal stretches, and a plank is tried hardest in the middle of a stretch. What
 * the traveller asks of it there grows with the traveller's weight and with the length of the stretch; what the
 * plank can give grows with its thickness. It holds when
 *
 *   2 × plank × (posts + 1)  ≥  weight × gap
 *
 * so a heavier traveller or a wider gap needs more, and a thicker plank or one more post gives more. Never the
 * other way about.
 *
 * Left out: the plank's own weight; that a real plank twice as thick is more than twice as strong; bounce; how the
 * ends are held; where on a stretch the traveller happens to be (the worst place is assumed).
 */
const bridge: Model = (given, choice) => {
  const weight = TRAVELLERS[part(given, choice, 'traveller')] ?? 0;
  const plank = PLANKS[part(given, choice, 'plank')] ?? 0;
  const posts = POSTS[part(given, choice, 'posts')] ?? 0;
  const holds = 2 * plank * (posts + 1) >= weight * Number(given.gap);
  return { works: holds, outcome: holds ? 'held' : 'sagged' };
};

// ---------------------------------------------------------------------------------------------------------------------
// The ramp
// ---------------------------------------------------------------------------------------------------------------------

export const HEIGHTS: Readonly<Record<string, number>> = { low: 1, mid: 2, high: 3 };
export const SURFACES: readonly string[] = ['rough', 'smooth'];
/** The ground is marked off in this many equal lengths. */
export const RAMP_LENGTHS = 6;

/** How many lengths a ball rolls along the ground from a ramp of this height, on this ground. */
export function rampReach(height: string, surface: string): number {
  return (HEIGHTS[height] ?? 0) * (surface === 'rough' ? 1 : 2);
}

/**
 * A ball let go at the top of a ramp rolls down it and on along the ground, and stops. The higher the ramp, the
 * further it goes; on rough ground it goes half as far as on smooth. The ground is marked off in equal lengths,
 * and the ball has to stop on the one with the star.
 *
 *   given    target: which length the star is on (1 is nearest the ramp);  surface, where it cannot be changed
 *   choice   height: "low", "mid" or "high";  surface: "rough" or "smooth", where it can be
 *
 * Left out: how heavy the ball is (in this model, as nearly in the world, it makes no difference); the ball's
 * size and what it is made of; bumps; that a real ball slows a little on the ramp as well.
 */
const ramp: Model = (given, choice) => {
  const reach = rampReach(part(given, choice, 'height'), part(given, choice, 'surface'));
  const target = Number(given.target);
  if (reach === target) return { works: true, outcome: 'landed' };
  return { works: false, outcome: reach < target ? 'rolled-short' : 'rolled-past' };
};

// ---------------------------------------------------------------------------------------------------------------------
// The balance
// ---------------------------------------------------------------------------------------------------------------------

export const COUNTS: Readonly<Record<string, number>> = { one: 1, two: 2, three: 3 };
/** How far out along the beam a place is, in steps from the middle. */
export const PLACES: Readonly<Record<string, number>> = { near: 1, mid: 2, far: 3 };

/**
 * A beam resting on its middle, with equal blocks stacked at one place on each side.
 *
 *   given    leftWeight: 1 to 3 blocks;  leftAt: 1 to 3 steps out from the middle
 *   choice   weight: "one", "two" or "three" blocks on the right;  at: "near", "mid" or "far" (1, 2 or 3 steps out)
 *
 * The rule. A stack pushes its side down by its number of blocks times its distance from the middle. The side
 * that pushes harder goes down; when the two push equally the beam stays level. So one block far out balances
 * three close in.
 *
 * Left out: the beam's own weight (it is level on its own); the pivot rubbing; blocks sliding as it tips; how far
 * it tips (a real beam goes down until it meets the ground).
 */
const balance: Model = (given, choice) => {
  const left = Number(given.leftWeight) * Number(given.leftAt);
  const right =
    (COUNTS[part(given, choice, 'weight')] ?? 0) * (PLACES[part(given, choice, 'at')] ?? 0);
  if (left === right) return { works: true, outcome: 'balanced' };
  return { works: false, outcome: left > right ? 'tipped-left' : 'tipped-right' };
};

// ---------------------------------------------------------------------------------------------------------------------
// The boat, and things dropped in water
// ---------------------------------------------------------------------------------------------------------------------

/** How many stones each boat can carry before the water comes over its side. */
export const BOATS: Readonly<Record<string, number>> = { shell: 1, bark: 2, raft: 3 };

/**
 * A boat loaded with stones, sent across a pond.
 *
 *   given    need: how many stones are waiting to go across (1 to 3)
 *   choice   boat: "shell", "bark" or "raft";  cargo: "one", "two" or "three" stones put aboard
 *
 * The rule. A boat floats by pushing water aside, and a bigger boat can push more aside before it is full: the
 * shell carries one stone, the bark boat two, the raft three. Put more aboard than that and it goes under. A
 * design works when the boat floats and no stone is left behind.
 *
 * Left out: the boat's own weight; where in the boat the stones sit (a real boat loaded to one side tips over);
 * waves; that stones differ.
 */
const boat: Model = (given, choice) => {
  const capacity = BOATS[part(given, choice, 'boat')] ?? 0;
  const cargo = COUNTS[part(given, choice, 'cargo')] ?? 0;
  if (cargo > capacity) return { works: false, outcome: 'sank' };
  const all = cargo >= Number(given.need);
  return { works: all, outcome: all ? 'floated' : 'left-behind' };
};

/**
 * Things to drop in a tub of water, and whether each floats. What decides it is what the thing is made of — how
 * heavy it is for its size — and not how big it is: the log is the biggest thing here and floats, the pebble is
 * one of the smallest and sinks. Each entry is something a family can try in a bowl and see for themselves.
 */
export const DROPPED: Readonly<Record<string, { floats: boolean; made: string; size: string }>> = {
  log: { floats: true, made: 'wood', size: 'big' },
  ball: { floats: true, made: 'air inside', size: 'big' },
  cork: { floats: true, made: 'cork', size: 'small' },
  'wooden-spoon': { floats: true, made: 'wood', size: 'middling' },
  brick: { floats: false, made: 'baked clay', size: 'big' },
  pebble: { floats: false, made: 'stone', size: 'small' },
  key: { floats: false, made: 'metal', size: 'small' },
  'metal-spoon': { floats: false, made: 'metal', size: 'middling' },
};

/**
 * A thing let go above a tub of water.
 *
 *   given    thing: one of the things in `DROPPED`
 *
 * Left out: everything that makes a real thing behave oddly — a leaf that soaks and sinks in the end, a spoon laid
 * so gently that it sits on the surface for a moment. Each thing does here what it does when a child drops it in.
 */
const tub: Model = (given) => {
  const floats = DROPPED[String(given.thing)]?.floats === true;
  return { works: floats, outcome: floats ? 'floated' : 'sank' };
};

// ---------------------------------------------------------------------------------------------------------------------
// All of them
// ---------------------------------------------------------------------------------------------------------------------

/** The models, by workbench. A workbench with no model cannot be tested: asking is a fault in the caller. */
export const MODELS: Partial<Record<DesignTask['model'], Model>> = { bridge, ramp, balance, boat };

/** Every set-up that can be tested, by the name its picture goes by: the workbenches, and the tub. */
const SCENES: Readonly<Record<string, Model>> = { bridge, ramp, balance, boat, tub };

/** Everything that can happen at each, in the order it is offered when a child is asked what will. */
export const OUTCOMES: Readonly<Record<string, readonly string[]>> = {
  bridge: ['held', 'sagged'],
  ramp: ['rolled-short', 'landed', 'rolled-past'],
  balance: ['tipped-left', 'balanced', 'tipped-right'],
  boat: ['floated', 'sank', 'left-behind'],
  tub: ['floated', 'sank'],
};

/** What each workbench lets a child change, and the values each part can take, in the order they are shown. */
export const CONTROLS: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  bridge: { plank: Object.keys(PLANKS), posts: Object.keys(POSTS) },
  ramp: { height: Object.keys(HEIGHTS), surface: SURFACES },
  balance: { weight: Object.keys(COUNTS), at: Object.keys(PLACES) },
  boat: { boat: Object.keys(BOATS), cargo: Object.keys(COUNTS) },
  tub: {},
};

const whole = (value: unknown, from: number, to: number): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value >= from && value <= to;

/** What a challenge must fix at each, each with a check that the value makes sense. */
const FIXED: Readonly<Record<string, Readonly<Record<string, (value: unknown) => boolean>>>> = {
  bridge: {
    gap: (value) => GAPS.includes(value as number),
    traveller: (value) => typeof value === 'string' && value in TRAVELLERS,
  },
  ramp: { target: (value) => whole(value, 1, RAMP_LENGTHS) },
  balance: {
    leftWeight: (value) => whole(value, 1, 3),
    leftAt: (value) => whole(value, 1, 3),
  },
  boat: { need: (value) => whole(value, 1, 3) },
  tub: { thing: (value) => typeof value === 'string' && value in DROPPED },
};

/**
 * What is wrong with a set-up, in words, or `null` if it can be tested: every part the model reads is there and
 * is a value the model knows, and nothing else is.
 */
export function setupProblem(scene: string, setup: Setup): string | null {
  const fixed = FIXED[scene];
  const controls = CONTROLS[scene];
  if (!fixed || !controls) return `"${scene}" is not something that can be tested`;
  for (const [key, valid] of Object.entries(fixed)) {
    if (!valid(setup[key])) return `${key} is ${JSON.stringify(setup[key])}`;
  }
  for (const [key, options] of Object.entries(controls)) {
    if (!options.includes(String(setup[key]))) return `${key} is ${JSON.stringify(setup[key])}`;
  }
  for (const key of Object.keys(setup)) {
    if (!(key in fixed) && !(key in controls)) return `${key} is not a part of a ${scene}`;
  }
  return null;
}

/** What happens when a whole set-up is tested. `null` if it is not one that can be. */
export function testSetup(scene: string, setup: Setup): TestResult | null {
  const model = SCENES[scene];
  if (!model || setupProblem(scene, setup) !== null) return null;
  return model(setup, {});
}

/** The design as the controls name it: one chosen option for each. `null` if the choice is not one the task offers. */
export function readDesign(
  task: DesignTask,
  options: readonly string[],
): Record<string, string> | null {
  if (options.length !== task.controls.length) return null;
  const choice: Record<string, string> = {};
  for (const [index, control] of task.controls.entries()) {
    const option = options[index];
    if (option === undefined || !control.options.includes(option)) return null;
    choice[control.id] = option;
  }
  return choice;
}

/**
 * The design a task starts from: for each part that can be changed, the value the task gives it to begin with, or
 * else the first value it can take.
 */
export function startingDesign(task: DesignTask): string[] {
  return task.controls.map((control) => {
    const given = String(task.given[control.id] ?? '');
    return control.options.includes(given) ? given : (control.options[0] ?? '');
  });
}

/** Test a design. `null` if the choice is not one the task offers, or the workbench has no model. */
export function testDesign(task: DesignTask, options: readonly string[]): TestResult | null {
  const choice = readDesign(task, options);
  const model = MODELS[task.model];
  if (!choice || !model) return null;
  return model(task.given, choice);
}
