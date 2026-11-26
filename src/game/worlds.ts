import type { WorldId } from '@/engine';

/**
 * The worlds of the archipelago — six islands, and the Music Lab in the lighthouse between them: what each is for,
 * in words a grown-up can check, and what there is to play in it. An activity with no lessons has not been built:
 * the world's page says so, and offers nothing for it.
 */

export type WorldRole =
  'reading' | 'number' | 'robot' | 'memory' | 'inventor' | 'explorer' | 'music';

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
  /**
   * A room of the world's own, where it has one: a place to play freely (the Music Lab's), or to look at what
   * has been made (Inventor Island's). Nothing is asked there. `note` is for the grown-up.
   */
  room?: { title: string; note: string };
  /**
   * More that could be built here one day and has not been. It is listed for the grown-up, plainly as not built,
   * and nothing on the page leads to it.
   */
  later?: { name: string; about: string }[];
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
      'Reading starts with listening. Children tune in to sounds, hear rhymes, the beats and the first sound of a word, and only then meet the letter that stands for it — no alphabet needed to begin. Then words to blend, to build and to read, and at last a sentence.',
    activities: [
      { title: 'Listening for sounds all around', lessons: ['rc-listen-01', 'rc-listen-02'] },
      { title: 'Rhymes, and the beats of a word', lessons: ['rc-rhyme-01', 'rc-syllables-01'] },
      { title: 'Hearing the first sound in a word', lessons: ['rc-first-01', 'rc-first-02'] },
      {
        title: 'Linking a letter shape to its sound',
        lessons: ['rc-letters-01', 'rc-letters-02', 'rc-letters-03', 'rc-letters-04'],
      },
      { title: 'Blending sounds into words', lessons: ['rc-blend-01', 'rc-blend-02'] },
      { title: 'Building a word from its sounds', lessons: ['rc-spell-01'] },
      { title: 'Two letters, one sound: sh, ch, th', lessons: ['rc-letters-05', 'rc-blend-03'] },
      { title: 'Reading a sentence', lessons: ['rc-sentences-01'] },
    ],
    role: 'reading',
  },
  {
    id: 'number-garden',
    name: 'Number Garden',
    focus: 'Amounts first, numerals later',
    about:
      'Number sense grows from real amounts. Children match, compare and count things they can see before any numeral appears, so that a written 3 means something when it comes. Then the numerals, the numbers in order, and adding and taking away as little stories.',
    activities: [
      { title: 'Same amount and different amount', lessons: ['ng-same-amount-01'] },
      { title: 'Seeing small amounts at a glance', lessons: ['ng-glance-01'] },
      { title: 'Counting to five, then ten', lessons: ['ng-give-01', 'ng-give-02'] },
      { title: 'More, fewer and equal', lessons: ['ng-more-01', 'ng-fewer-01', 'ng-equal-01'] },
      { title: 'Amounts in order: one more each time', lessons: ['ng-stairs-01'] },
      { title: 'Making five, then ten', lessons: ['ng-frame-01', 'ng-frame-02'] },
      {
        title: 'Numerals for amounts, zero to ten',
        lessons: ['ng-numerals-01', 'ng-numerals-02', 'ng-numerals-03'],
      },
      { title: 'The numbers in order', lessons: ['ng-line-01'] },
      {
        title: 'Adding and taking away, as stories',
        lessons: ['ng-add-01', 'ng-take-01', 'ng-add-02', 'ng-take-02'],
      },
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
      { title: 'One arrow, one move', lessons: ['rr-move-01'] },
      { title: 'Two and three steps in order', lessons: ['rr-steps-01'] },
      { title: 'Do it again: repeats', lessons: ['rr-repeat-01'] },
      { title: 'Finding the step that went wrong', lessons: ['rr-mend-01'] },
      { title: 'A longer way', lessons: ['rr-plan-01'] },
      { title: 'Wait for the bridge', lessons: ['rr-bridge-01'] },
      { title: 'A long way round', lessons: ['rr-plan-02'] },
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
      { title: 'Your own way to remember', lessons: ['mf-choose-01'] },
      { title: 'Keeping it for next time', lessons: ['mf-later-01'] },
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
      {
        title: 'Bridges that hold',
        lessons: ['ii-bridge-01'],
        together: {
          what: 'Lay a ruler or a strip of card across two low stacks of books and stand a soft toy on it. Then try thicker card, or put a block under the middle. You need: books, card or a ruler, a soft toy, a few big blocks. Mess: only books and blocks to put back. Ask: what happened to the bridge? What changed when you put the block under it?',
          safety:
            'Stay with your child. Keep the stacks low and the toys light, and keep small blocks away from a child who still puts things in their mouth.',
        },
      },
      {
        title: 'Ramps and rolling',
        lessons: ['ii-ramp-01'],
        together: {
          what: 'Prop a big book or a tray on a cushion and let a soft ball roll down onto the floor; mark where it stops with a sock. Then make the ramp higher, and then roll it onto a towel. You need: a tray or big book, a cushion, a soft ball, a towel. Mess: very little, if the floor is clear first. Ask: where did it stop? What made it go further?',
          safety:
            'Stay with your child. Roll, never throw; keep it on the floor and away from stairs. A marble or any ball small enough to fit in a mouth can choke a small child: use a big one.',
        },
      },
      {
        title: 'Balancing',
        lessons: ['ii-balance-01'],
        together: {
          what: 'Rest a ruler across a pencil on the table and put the same big bricks on each end; then move one brick nearer the middle. You need: a ruler, a pencil, four or five big bricks that are all the same. Mess: very little. Ask: which side went down? How did you make it level again?',
          safety:
            'Stay with your child. Use bricks too big to swallow and count them back in afterwards; coins and other small things are a choking risk.',
        },
      },
      {
        title: 'Float or sink',
        lessons: ['ii-float-01'],
        together: {
          what: 'Fill a washing-up bowl a hand deep and gather a few big, safe things: a wooden spoon, a metal spoon, an apple, an empty plastic tub, a big smooth stone. Guess each one first, then try it. You need: the bowl, the things, a towel. Mess: splashes, so put the towel down first. Ask: what did you think would happen? What did happen?',
          safety:
            'Never leave a child alone with water, even a little, even for a moment. Stay within reach the whole time and empty the bowl as soon as you finish. Nothing small enough to swallow.',
        },
      },
      {
        title: 'A shelter from the wind',
        lessons: ['ii-shelter-01'],
        together: {
          what: 'Stand a piece of card up on the table as a wall, with a paper cup or a folded paper figure behind it, and blow at it gently through a drinking straw, or fan it with a book. Then lean a pencil against the card, first on your side and then on the far side, and blow again. You need: card, a paper cup or a paper figure, a pencil, a straw or a book. Mess: none. Ask: which way did the wall fall? Where did the pencil have to be to hold it up?',
          safety:
            'Stay with your child. Blow or fan gently, with breath or a book only: no hair dryer, no electric fan, nothing lit. Sit down to use the straw, and keep the pencil away from faces.',
        },
      },
    ],
    role: 'inventor',
    room: {
      title: 'My inventions',
      note: 'The last thing your child mended at each workbench, drawn exactly as they left it, and how their guesses went. Nothing is asked there. It is made from what they did in the game, and from what you say was tried away from the screen: the game saw only the first.',
    },
  },
  {
    id: 'explorer-harbor',
    name: 'Explorer Harbor',
    focus: 'Stories and the wide world',
    about:
      'Stories told in pictures — beginning, middle and end, and why things happen — first ideas about a map: land and water, near and far — and a globe of the real world, with its seven big lands and fifteen famous places.',
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
      {
        title: 'The seven big lands',
        lessons: ['eh-lands-01', 'eh-lands-02'],
        together: {
          what: 'Find a globe or a map of the world, or draw the seven big lands roughly on paper. Say the name of one and find it together, then let your child choose one for you to find. Where do you live? Where does someone you know live?',
          safety:
            'Nothing to watch out for. Maps do not all use the same names: the lands of the Pacific are Oceania here, and Australia or Australasia on other maps. Any of them is right.',
        },
      },
      {
        title: 'Famous places',
        lessons: ['eh-places-01'],
        together: {
          what: 'Choose one of the famous places and look for a photograph of the real thing in a book. What is it made of? Who built it, or is it a mountain or a waterfall that nobody built? Then make one together from blocks, boxes or sand.',
          safety:
            'Nothing to watch out for. One famous place is a very small part of a country: if your child asks what it is like there, look for more than one picture.',
        },
      },
    ],
    role: 'explorer',
  },
  {
    id: 'music-lab',
    name: 'Music Lab',
    focus: 'High and low, a steady beat, a tune of your own',
    about:
      'A music room in the lighthouse, with chime bars and a drum. Children listen for high and low, tell whether two short tunes are the same, tap along with a slow beat, play back a few notes, and make up small tunes of their own. Nobody needs to read music or to have a musical ear: every sound can be heard again as often as they like, and what is noticed is listening, order and rough tempo — never talent.',
    activities: [
      {
        title: 'High and low',
        lessons: ['ml-high-low-01'],
        together: {
          what: 'Sing or hum two notes, one high and squeaky, one low and growly, and ask which was the high one. Stretch up tall for a high sound and crouch down for a low one. Then let your child make the two sounds for you to guess.',
          safety: 'Nothing to watch out for. Keep it quiet enough to be kind to small ears.',
        },
      },
      { title: 'The same, or different?', lessons: ['ml-same-01'] },
      {
        title: 'Tapping with the beat',
        lessons: ['ml-beat-01'],
        together: {
          what: 'Put on any slow, steady song and pat your knees together in time with it. Walk around the room to the beat. Now and then stop the music, and freeze.',
          safety:
            'Clear the floor first. Keep the volume low: loud music close to small ears is not safe.',
        },
      },
      { title: 'Play it back', lessons: ['ml-echo-01'] },
      { title: 'The same tune again', lessons: ['ml-again-01'] },
      {
        title: 'Make a tune',
        lessons: ['ml-tune-01'],
        together: {
          what: 'Line up three or four glasses with different amounts of water and tap each gently with a wooden spoon. Find the lowest and the highest, then make up a tune that climbs and comes back down.',
          safety:
            'Stay with your child: glasses break. Tap gently, use sturdy tumblers, and mop up spills so nobody slips.',
        },
      },
    ],
    role: 'music',
    room: {
      title: 'Just play',
      note: 'All eight chime bars of the octave and a drum, with a slow beat to play along to. Nothing is asked there, nothing is right or wrong, and nothing is kept.',
    },
    later: [
      {
        name: 'Spatial Workshop',
        about:
          'Turning shapes and fitting them together, and symmetry, without needing the shapes’ names.',
      },
      {
        name: 'Chess Nursery',
        about:
          'The squares of the board, how each piece moves, and plans one step long — with no clock.',
      },
      {
        name: 'Sky Observatory',
        about: 'Day and night, the phases of the moon, and the planets in their order.',
      },
      {
        name: 'Language Garden',
        about:
          'Everyday words and short phrases in another language, from recordings by people who speak it.',
      },
      {
        name: 'Feelings Theatre',
        about: 'Short made-up scenes about feelings, and how the same thing looks to someone else.',
      },
    ],
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
