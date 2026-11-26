import { KitPicture } from '@/art/pictures';
import { WAYS, type Challenge, type Stimulus } from '@/engine';
import type { PictureProps, WorldModule } from '../modules';
import { RecallBoard } from './RecallBoard';
import { chooseScript, makeScript } from './script';
import { describe, memoryText } from './text';
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

/**
 * "Think back to last time": the same arrow curling round, with a moon in its heart for the night that may have
 * gone by. It stands on the leaf that covers the things kept, at the start of the next sitting.
 */
function LastTime() {
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
      <path d="M4-9A11 11 0 1 0 9 10 9 9 0 0 1 4-9z" fill="#f2a93b" />
    </svg>
  );
}

/** A scene of this world: things in a row, in two groups, or two and two — who had what, what was where. */
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
  if (scene === 'groups') {
    // Two and two: each two that go together share a ring, with room between the rings.
    const ids = listOf(of.ids);
    return (
      <span className={styles.groups} data-scene="groups">
        {[ids.slice(0, 2), ids.slice(2)].map((group) => (
          <span key={group.join('-')} className={styles.group}>
            {group.map((id) => (
              <KitPicture key={id} id={id} className={styles.picture} />
            ))}
          </span>
        ))}
      </span>
    );
  }
  const owners = listOf(of.owners);
  const things = listOf(of.things);
  return (
    <span className={styles.pairs} data-scene={scene} data-count={owners.length}>
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
      return stimulus.id === 'last-time' ? <LastTime /> : <Earlier />;
    // Things other worlds draw.
    case 'quantity':
    case 'sound':
    case 'letter':
    case 'word':
      return null;
  }
}

/** The lines a challenge is told with beside its own: what each way of looking is called, and what each asks. */
function linesFor(challenge: Challenge): string[] {
  if (challenge.kind !== 'make' || challenge.task.type !== 'recall') return [];
  return [...challenge.task.ways.map((way) => way.ask), ...WAYS.map(memoryText.wayLine)];
}

const memoryForest: WorldModule = {
  Picture,
  describe,
  chooseScript,
  makeScript,
  boards: { recall: RecallBoard },
  linesFor,
  voice,
};
export default memoryForest;
