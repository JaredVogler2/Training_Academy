import type { WorldId } from '@/engine';

/**
 * The six worlds of the archipelago: what each is for, in words a grown-up can check, and what there is to play in
 * it. An activity with no lessons has not been built: the world's page says so, and offers nothing for it.
 */

export type WorldRole = 'reading' | 'number' | 'robot' | 'memory' | 'inventor' | 'explorer';

export interface WorldInfo {
  id: WorldId;
  name: string;
  /** One line under the name. */
  focus: string;
  /** For grown-ups: what a child will practise here. */
  about: string;
  /** What the world teaches, in teaching order. */
  activities: Activity[];
  role: WorldRole;
}

export interface Activity {
  /** For grown-ups. */
  title: string;
  /** The lessons that make it up, easiest first, by id. None, where the activity has not been built. */
  lessons: string[];
  /**
   * Something to try together away from the screen, where the activity has one, with what to watch out for.
   * It is written for the grown-up and shown only to them.
   */
  together?: { what: string; safety: string };
}

export const WORLDS: readonly WorldInfo[] = [
  {
    id: 'reading-cove',
    name: 'Reading Cove',
    focus: 'Sounds first, then letters, then words',
    about:
      'Reading starts with listening. Children tune in to sounds, hear the first sound of a word, and only then meet the letter that stands for it — no alphabet needed to begin.',
    activities: [
      { title: 'Listening for sounds all around', lessons: ['rc-listen-01', 'rc-listen-02'] },
      { title: 'Hearing the first sound in a word', lessons: ['rc-first-01', 'rc-first-02'] },
      {
        title: 'Linking a letter shape to its sound',
        lessons: ['rc-letters-01', 'rc-letters-02', 'rc-letters-03', 'rc-letters-04'],
      },
      { title: 'Blending sounds into words', lessons: ['rc-blend-01', 'rc-blend-02'] },
    ],
    role: 'reading',
  },
  {
    id: 'number-garden',
    name: 'Number Garden',
    focus: 'Amounts first, numerals later',
    about:
      'Number sense grows from real amounts. Children match, compare and count things they can see before any numeral appears, so a written 3 later means something.',
    activities: [
      { title: 'Same amount and different amount', lessons: ['ng-same-amount-01'] },
      { title: 'Seeing small amounts at a glance', lessons: ['ng-glance-01'] },
      { title: 'Counting to five, then ten', lessons: ['ng-give-01', 'ng-give-02'] },
      { title: 'More, fewer and equal', lessons: ['ng-more-01', 'ng-fewer-01', 'ng-equal-01'] },
    ],
    role: 'number',
  },
  {
    id: 'robot-ridge',
    name: 'Robot Ridge',
    focus: 'Planning steps and fixing them',
    about:
      'A friendly robot follows picture commands. Children plan a short route, watch it run, and learn to find and fix the one step that went wrong — no typing, no reading.',
    activities: [
      { title: 'One arrow, one move', lessons: [] },
      { title: 'Two and three steps in order', lessons: [] },
      { title: 'Do it again: repeats', lessons: [] },
      { title: 'Finding the step that went wrong', lessons: [] },
    ],
    role: 'robot',
  },
  {
    id: 'memory-forest',
    name: 'Memory Forest',
    focus: 'Remembering, and ways to remember',
    about:
      'Short hide-and-find games in a forest, with the tricks that help: grouping things, making up a silly story, walking a familiar path. Practice at remembering, not a measure of anything.',
    activities: [
      { title: 'Matching pairs', lessons: ['mf-pairs-01'] },
      { title: 'What was hidden?', lessons: ['mf-hidden-01'] },
      { title: 'Remembering an order', lessons: ['mf-order-01'] },
      {
        title: 'Grouping and story tricks',
        lessons: ['mf-groups-01', 'mf-story-01', 'mf-places-01'],
      },
    ],
    role: 'memory',
  },
  {
    id: 'inventor-island',
    name: 'Inventor Island',
    focus: 'Guess, build, test, change',
    about:
      'A workshop for small engineers: guess what will happen, build it, watch, change one thing and try again. Each activity ends with something safe to try together away from the screen.',
    activities: [
      { title: 'Bridges that hold', lessons: [] },
      { title: 'Ramps and rolling', lessons: [] },
      { title: 'Balancing', lessons: [] },
      { title: 'Float or sink', lessons: [] },
    ],
    role: 'inventor',
  },
  {
    id: 'explorer-harbor',
    name: 'Explorer Harbor',
    focus: 'Stories and the wide world',
    about:
      'Stories told in pictures — beginning, middle and end, and why things happen — and first ideas about a map: land and water, near and far.',
    activities: [
      {
        title: 'Beginning, middle, end',
        lessons: ['eh-story-01', 'eh-ending-01'],
        together: {
          what: 'Tell the story of something you did today in three parts: first, then, last. Draw the three parts on scraps of paper, mix them up, and put them back in order together. Then let your child tell one for you to draw.',
          safety:
            'Nothing to watch out for. Any order your child can give a reason for is worth listening to.',
        },
      },
      {
        title: 'Why did that happen?',
        lessons: ['eh-why-01', 'eh-next-01'],
        together: {
          what: 'Put an ice cube on a saucer in a warm spot and another in the fridge. Guess together what each will be like after lunch, then look. Ask what made the difference.',
          safety: 'Ice and water only: nothing hot, and nothing a small child could swallow whole.',
        },
      },
      {
        title: 'Land and water',
        lessons: ['eh-water-01', 'eh-land-01'],
        together: {
          what: 'Look at a map or a globe together and find the blue. Find a place that is all land and a place that is all water, and trace a shore with a finger.',
          safety: 'Nothing to watch out for.',
        },
      },
      {
        title: 'Near and far',
        lessons: ['eh-near-01', 'eh-far-01'],
        together: {
          what: 'Stand still in a room and pick three things. Which is nearest? Which is farthest? Walk to each and count the steps to find out.',
          safety: 'Clear the floor first, and choose things that are safe to walk up to.',
        },
      },
    ],
    role: 'explorer',
  },
];

/** Every lesson of a world, in the order they are meant to be met. */
export function lessonsOf(world: WorldInfo): string[] {
  return world.activities.flatMap((activity) => activity.lessons);
}

/** Whether a world has anything to play. */
export function isOpen(world: WorldInfo): boolean {
  return lessonsOf(world).length > 0;
}

export function worldById(id: WorldId): WorldInfo {
  const world = WORLDS.find((candidate) => candidate.id === id);
  if (!world) throw new Error(`Unknown world: ${id}`);
  return world;
}
