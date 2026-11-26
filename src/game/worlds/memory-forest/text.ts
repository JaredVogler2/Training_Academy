import { wordFor } from '@/art/pictures';
import type { Stimulus, Way } from '@/engine';

/**
 * Words on Memory Forest's own board. They are for the grown-up alongside and for screen readers; the child
 * needs none: each stands beside a picture that says the same, and what a tap on that picture does is seen at once.
 */

/** What Glim says, and the board writes, when a way of looking is chosen: the same words as the recordings. */
const WAY_WORDS: Record<Way, string> = {
  groups: 'In two groups.',
  story: 'As a silly story.',
  places: 'At places along a path.',
};

const WAY_BUTTONS: Record<Way, string> = {
  groups: 'Look at them in two groups',
  story: 'Look at them as a silly story',
  places: 'Look at them at places along a path',
};

export const memoryText = {
  /** The line for a way of looking, by its key for the voice. */
  wayLine: (way: Way) => `mf.ways.${way}`,
  wayWords: (way: Way) => WAY_WORDS[way],
  wayButton: (way: Way) => WAY_BUTTONS[way],
  ways: 'Ways to look at them',
  /** Before a way has been chosen: the things, as they come. */
  asTheyCome: (names: string) => `To remember: ${names}`,
  lastTime: 'Think back to the last time you played this',
} as const;

const listOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((each): each is string => typeof each === 'string') : [];

const sentence = (words: readonly string[]) =>
  words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1) ?? ''}`;

/** A picture of this world, in words, for someone who cannot see it. */
export function describe(stimulus: Stimulus): string {
  switch (stimulus.type) {
    case 'picture':
      return wordFor(stimulus.id);
    case 'sign':
      return stimulus.id === 'last-time' ? memoryText.lastTime : 'Think back to the very start';
    case 'scene': {
      const { scene, of } = stimulus;
      if (scene === 'things') return `To remember: ${sentence(listOf(of.ids).map(wordFor))}`;
      if (scene === 'groups') {
        const ids = listOf(of.ids).map(wordFor);
        return `To remember: ${sentence(ids.slice(0, 2))} together, and ${sentence(ids.slice(2))} together`;
      }
      const things = listOf(of.things);
      const joined = listOf(of.owners).map((owner, index) =>
        scene === 'places'
          ? `${wordFor(things[index] ?? '')} at the ${wordFor(owner)}`
          : `the ${wordFor(owner)} has the ${wordFor(things[index] ?? '')}`,
      );
      return `To remember: ${sentence(joined)}`;
    }
    case 'quantity':
    case 'sound':
    case 'letter':
    case 'word':
      return '';
  }
}
