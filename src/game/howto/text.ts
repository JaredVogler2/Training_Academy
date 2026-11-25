import { stepOf, type HowTo } from './steps';

/**
 * The words of "how to play". What Glim says is recorded (`src/voice/lines.json`, the lines that begin `howto.`);
 * the same words are written at the foot of the screen for a grown-up and for a screen reader. A test holds the
 * two together.
 */
export const howToText = {
  title: 'How to play',
  /** The way out, at any moment. */
  skip: 'Skip: go to the islands',
  progress: (step: number, count: number) => `Part ${step} of ${count}`,
  watch: 'Watch.',
  yourTurn: 'Your turn.',
  lines: {
    hello: 'Let me show you how to play.',
    choose: 'Tap the one that is the same.',
    place: 'Tap the picture, and it goes to its place.',
    done: 'When you have finished, tap the tick.',
    again: 'Tap me, and I will say it again.',
    yes: 'Yes. Like that.',
    end: 'Now you know how to play.',
  },
  bell: 'A bell',
  rings: 'The bell rings.',
} as const;

/**
 * What is written at the foot of the screen: what Glim is showing, or asking for, or has just said. Placing has
 * two lines, and the one about the tick is the one written once everything is in its place.
 */
export function captionOf(state: HowTo): string {
  const step = stepOf(state);
  if (step === null) return '';
  const { lines } = howToText;
  if (state.phase === 'done') return step === 'again' ? lines.end : lines.yes;
  const placed = state.placed.every((card) => card !== null);
  const what = step === 'place' ? (placed ? lines.done : lines.place) : lines[step];
  return `${state.phase === 'show' ? howToText.watch : howToText.yourTurn} ${what}`;
}
