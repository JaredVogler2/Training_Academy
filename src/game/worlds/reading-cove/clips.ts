import marksFile from '@/voice/marks/reading-cove.json';

/**
 * Where, in a clip that has several things in it, each one begins: the sounds of a word said slowly, the beats of
 * a word that is clapped, the words of a sentence read aloud. The voice tool writes them down when it makes the
 * clip (src/voice/marks), from what the synthesiser says of its own speech; nothing here listens to anything.
 */
const marks: Readonly<Record<string, readonly number[]>> = marksFile;

/** How long after one clap of a card the next one comes, in milliseconds. */
export const CLAP_GAP = 340;
/** How far apart things are shown when nothing says when they come and the clip's length is not known either. */
const APART = 420;

/**
 * When each of the `parts` things in a clip begins, in milliseconds from its start. Where the clip has no marks,
 * or not that many, they are spread evenly over `spoken`, the length of the clip: something is still shown for
 * each, in order, and nothing is claimed about when.
 */
export function marksOf(key: string, parts: number, spoken: number): number[] {
  const written = marks[key];
  if (written?.length === parts) return written.map((at) => Math.round(at * 1000));
  const step = spoken > 0 ? spoken / parts : APART;
  return Array.from({ length: parts }, (_, index) => Math.round(index * step));
}

/** Whether a clip has its marks written down. */
export const hasMarks = (key: string): boolean => Object.hasOwn(marks, key);
