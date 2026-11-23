import type { Setup, Stimulus } from '@/engine';

/**
 * Inventor Island in words: what each picture shows, for screen readers and for the grown-up alongside. A child
 * needs none of it — the pictures and the tests carry everything.
 */

export const benchText = {
  test: 'Test',
  /** Why the test button is waiting, where it is. */
  changeFirst: 'Change something first, then test it.',
  guess: 'My guess',
} as const;

const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
const count = (amount: number, one: string, many: string) =>
  `${NUMBERS[amount] ?? String(amount)} ${amount === 1 ? one : many}`;
/** The words with a capital to begin with: the names of things are written to go in the middle of a sentence. */
const sentence = (words: string) => words.charAt(0).toUpperCase() + words.slice(1);

/** What each part that can be changed is called. */
export const CONTROL_NAMES: Readonly<Record<string, string>> = {
  plank: 'Plank',
  posts: 'Posts',
  height: 'How high the ramp is',
  surface: 'The ground',
  weight: 'How many blocks',
  at: 'How far out',
  boat: 'Boat',
  cargo: 'Stones aboard',
};

/** What each value a part can take is called. */
export const OPTION_NAMES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  plank: { thin: 'a thin plank', thick: 'a thick plank' },
  posts: { none: 'no posts', one: 'one post', two: 'two posts' },
  height: { low: 'a low ramp', mid: 'a middling ramp', high: 'a high ramp' },
  surface: { rough: 'rough ground', smooth: 'smooth ground' },
  weight: { one: 'one block', two: 'two blocks', three: 'three blocks' },
  at: { near: 'close in', mid: 'half way out', far: 'far out' },
  boat: { shell: 'the little shell', bark: 'the bark boat', raft: 'the big raft' },
  cargo: { one: 'one stone', two: 'two stones', three: 'three stones' },
};

export function optionName(control: string, option: string): string {
  return OPTION_NAMES[control]?.[option] ?? option;
}

const THINGS: Readonly<Record<string, string>> = {
  log: 'a big log',
  ball: 'a big ball',
  cork: 'a little cork',
  'wooden-spoon': 'a wooden spoon',
  brick: 'a big brick',
  pebble: 'a little pebble',
  key: 'a little key',
  'metal-spoon': 'a metal spoon',
};

const STEPS = ['', 'one step', 'two steps', 'three steps'];

/** How each way of turning out is said. */
export const OUTCOME_WORDS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  bridge: { held: 'it holds', sagged: 'it sags' },
  ramp: {
    'rolled-short': 'the ball stops too soon',
    landed: 'the ball stops on the star',
    'rolled-past': 'the ball rolls too far',
  },
  balance: {
    'tipped-left': 'the blue side goes down',
    balanced: 'it balances',
    'tipped-right': 'the orange side goes down',
  },
  boat: {
    floated: 'it floats across with all the stones',
    sank: 'it sinks',
    'left-behind': 'it floats across, but a stone is left behind',
  },
  tub: { floated: 'it floats', sank: 'it sinks' },
};

/** A set-up in words, before anything has happened to it. */
export function describeSetup(scene: string, setup: Setup): string {
  const text = (key: string) => String(setup[key] ?? '');
  switch (scene) {
    case 'bridge':
      return (
        `A bridge over a gap ${NUMBERS[Number(setup.gap)] ?? text('gap')} lengths wide: ` +
        `${optionName('plank', text('plank'))} with ${optionName('posts', text('posts'))}. ` +
        `A ${text('traveller')} is waiting to cross.`
      );
    case 'ramp':
      return (
        `${sentence(optionName('height', text('height')))} onto ${optionName('surface', text('surface'))}, with a ball at the top. ` +
        `The star is ${count(Number(setup.target), 'length', 'lengths')} along.`
      );
    case 'balance':
      return (
        `A beam on its middle. On the blue side, ${count(Number(setup.leftWeight), 'block', 'blocks')} ` +
        `${STEPS[Number(setup.leftAt)] ?? ''} out. On the orange side, ${optionName('weight', text('weight'))} ` +
        `${optionName('at', text('at'))}.`
      );
    case 'boat':
      return (
        `${sentence(count(Number(setup.need), 'stone', 'stones'))} to take across a pond. ` +
        `${sentence(optionName('boat', text('boat')))}, with ${optionName('cargo', text('cargo'))} aboard.`
      );
    case 'tub':
      return `A tub of water, and ${THINGS[text('thing')] ?? text('thing')} held over it.`;
    default:
      return '';
  }
}

/** A picture in words: a set-up, or a set-up and how it turned out. */
export function describe(stimulus: Stimulus, place?: 'prompt' | 'choice' | 'card'): string {
  if (stimulus.type !== 'scene') return '';
  const setup: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(stimulus.of)) {
    if (key !== 'shown' && (typeof value === 'string' || typeof value === 'number')) {
      setup[key] = value;
    }
  }
  const shown = typeof stimulus.of.shown === 'string' ? stimulus.of.shown : null;
  const happened = shown === null ? null : (OUTCOME_WORDS[stimulus.scene]?.[shown] ?? shown);
  // As a choice, the picture is one way things could turn out; that is all that needs saying.
  if (place === 'choice' && happened !== null) return sentence(happened);
  const before = describeSetup(stimulus.scene, setup);
  return happened === null ? before : `${before} Afterwards: ${happened}.`;
}
