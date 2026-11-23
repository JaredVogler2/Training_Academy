import { KitPicture, wordFor } from '@/art/pictures';
import type { Stimulus } from '@/engine';
import type { PictureProps, WorldModule } from '../modules';
import { chooseScript, makeScript } from './script';
import { voice } from './voice';
import styles from './memoryForest.module.css';

/** Memory Forest: remembering, and ways to remember. */

const listOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((each): each is string => typeof each === 'string') : [];

/**
 * "Think back": an arrow curling round to where it came from, with a small leaf at its heart. It stands where a
 * thing to look at would stand, for the one question that is about what was seen a long while ago.
 */
function Earlier() {
  return (
    <svg className={styles.sign} viewBox="-34 -34 68 68" aria-hidden="true" focusable="false">
      <path
        d="M20 8A22 22 0 1 1 14-17"
        fill="none"
        stroke="#6b4fd0"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
      <path d="M6-26l12 8-13 6z" fill="#6b4fd0" />
      <path d="M-10 8C-12-4-3-12 9-10c1 12-7 20-19 18z" fill="#5fbf64" />
      <path
        d="M-9 7C-3 2 3-4 8-9"
        fill="none"
        stroke="#2f8440"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A scene of this world: things in a row, or things two and two — who had what, what was where. */
function Scene({ stimulus }: { stimulus: Extract<Stimulus, { type: 'scene' }> }) {
  const { scene, of } = stimulus;
  if (scene === 'things') {
    return (
      <span className={styles.things} data-scene="things">
        {listOf(of.ids).map((id) => (
          <KitPicture key={id} id={id} className={styles.picture} />
        ))}
      </span>
    );
  }
  const owners = listOf(of.owners);
  const things = listOf(of.things);
  return (
    <span className={styles.pairs} data-scene={scene}>
      {owners.map((owner, index) => (
        // Each pair is one picture: the two overlap, so that they are seen together and not side by side.
        <span key={owner} className={styles.pair}>
          <KitPicture id={owner} className={styles.owner} />
          <KitPicture id={things[index] ?? ''} className={styles.thing} />
        </span>
      ))}
    </span>
  );
}

function Picture({ stimulus, sounding = false }: PictureProps) {
  switch (stimulus.type) {
    case 'picture':
      return (
        <span className={styles.frame} data-sounding={sounding}>
          <KitPicture id={stimulus.id} className={styles.picture} />
        </span>
      );
    case 'scene':
      return <Scene stimulus={stimulus} />;
    case 'sign':
      return <Earlier />;
    // Things other worlds draw.
    case 'quantity':
    case 'sound':
    case 'letter':
    case 'word':
      return null;
  }
}

const sentence = (words: readonly string[]) =>
  words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1) ?? ''}`;

export function describe(stimulus: Stimulus): string {
  switch (stimulus.type) {
    case 'picture':
      return wordFor(stimulus.id);
    case 'sign':
      return 'Think back to the very start';
    case 'scene': {
      const { scene, of } = stimulus;
      if (scene === 'things') return `To remember: ${sentence(listOf(of.ids).map(wordFor))}`;
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

const memoryForest: WorldModule = { Picture, describe, chooseScript, makeScript, voice };
export default memoryForest;
