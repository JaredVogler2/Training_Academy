import type { WorldId } from '@/engine';

/**
 * The six worlds of the archipelago: what each is for, in words a grown-up can check, and whether there is anything
 * to play in it yet. A world marked `coming-later` shows an honest preview and no activity buttons.
 */

export type WorldRole = 'reading' | 'number' | 'robot' | 'memory' | 'inventor' | 'explorer';

export interface WorldInfo {
  id: WorldId;
  name: string;
  /** One line under the name. */
  focus: string;
  /** For grown-ups: what a child will practise here. */
  about: string;
  /** Planned, in teaching order. Not built unless `status` says so. */
  planned: string[];
  status: 'sample' | 'coming-later';
  role: WorldRole;
  /** The lesson to offer first, where one has been authored. */
  firstLessonId: string | null;
}

export const WORLDS: readonly WorldInfo[] = [
  {
    id: 'reading-cove',
    name: 'Reading Cove',
    focus: 'Sounds first, then letters, then words',
    about:
      'Reading starts with listening. Children tune in to sounds, hear the first sound of a word, and only then meet the letter that stands for it — no alphabet needed to begin.',
    planned: [
      'Listening for sounds all around',
      'Hearing the first sound in a word',
      'Linking a letter shape to its sound',
      'Blending sounds into words',
    ],
    status: 'coming-later',
    role: 'reading',
    firstLessonId: null,
  },
  {
    id: 'number-garden',
    name: 'Number Garden',
    focus: 'Amounts first, numerals later',
    about:
      'Number sense grows from real amounts. Children match, compare and count things they can see before any numeral appears, so a written 3 later means something.',
    planned: [
      'Same amount and different amount',
      'Seeing small amounts at a glance',
      'Counting to five, then ten',
      'More, fewer and equal',
    ],
    status: 'sample',
    role: 'number',
    firstLessonId: 'ng-same-amount-01',
  },
  {
    id: 'robot-ridge',
    name: 'Robot Ridge',
    focus: 'Planning steps and fixing them',
    about:
      'A friendly robot follows picture commands. Children plan a short route, watch it run, and learn to find and fix the one step that went wrong — no typing, no reading.',
    planned: [
      'One arrow, one move',
      'Two and three steps in order',
      'Do it again: repeats',
      'Finding the step that went wrong',
    ],
    status: 'coming-later',
    role: 'robot',
    firstLessonId: null,
  },
  {
    id: 'memory-forest',
    name: 'Memory Forest',
    focus: 'Remembering, and ways to remember',
    about:
      'Short hide-and-find games in a forest, with the tricks that help: grouping things, making up a silly story, walking a familiar path. Practice at remembering, not a measure of anything.',
    planned: [
      'Matching pairs',
      'What was hidden?',
      'Remembering an order',
      'Grouping and story tricks',
    ],
    status: 'coming-later',
    role: 'memory',
    firstLessonId: null,
  },
  {
    id: 'inventor-island',
    name: 'Inventor Island',
    focus: 'Guess, build, test, change',
    about:
      'A workshop for small engineers: guess what will happen, build it, watch, change one thing and try again. Each activity ends with something safe to try together away from the screen.',
    planned: ['Bridges that hold', 'Ramps and rolling', 'Balancing', 'Float or sink'],
    status: 'coming-later',
    role: 'inventor',
    firstLessonId: null,
  },
  {
    id: 'explorer-harbor',
    name: 'Explorer Harbor',
    focus: 'Stories and the wide world',
    about:
      'Stories told in pictures — beginning, middle and end, and why things happen — and first ideas about the world: land and water, near and far, places and the people who live there.',
    planned: ['Beginning, middle, end', 'Why did that happen?', 'Land and water', 'Near and far'],
    status: 'coming-later',
    role: 'explorer',
    firstLessonId: null,
  },
];

export function worldById(id: WorldId): WorldInfo {
  const world = WORLDS.find((candidate) => candidate.id === id);
  if (!world) throw new Error(`Unknown world: ${id}`);
  return world;
}
