import type { CSSProperties } from 'react';
import { Letters } from '@/art/letters';
import { KitPicture, wordFor } from '@/art/pictures';
import { readReadingPicture, type Stimulus } from '@/engine';
import type { PictureProps, WorldModule } from '../modules';
import {
  BeatsWord,
  ClapCard,
  Placed,
  RhymeWord,
  Sentence,
  SentenceToRead,
  describeScene,
} from './scenes';
import { chooseScript, linesFor, makeScript, soundOf } from './script';
import { voice } from './voice';
import { lettersOf } from './words';
import styles from './readingCove.module.css';

/** Reading Cove: sounds first, then letters, then words, and then words in a row. */

/**
 * Something to listen to, with nothing to see: a shell, the way a shell is held to the ear. Tapping it asks to hear
 * it again. Waves come off it while it sounds.
 */
function Shell({
  clip,
  sounding,
  onAgain,
}: {
  clip: string;
  sounding: boolean;
  onAgain?: (() => void) | undefined;
}) {
  const drawing = (
    <svg
      className={styles.shell}
      viewBox="-34 -34 68 68"
      aria-hidden="true"
      focusable="false"
      data-sounding={sounding}
      data-clip={clip}
    >
      <ellipse cy="27" rx="20" ry="3.500" fill="#22304f" opacity="0.08" />
      <path
        d="M-22 14C-28-6-14-26 6-24c14 2 22 14 18 26-3 9-12 14-22 14-9 0-17-1-24-2z"
        fill="#ffcdbf"
      />
      <path
        d="M-18 12C-20-2-10-16 4-16c9 0 15 7 13 15-2 7-9 11-17 11"
        fill="none"
        stroke="#ff8f7a"
        strokeWidth="3.600"
        strokeLinecap="round"
      />
      <path
        d="M-10 8c0-8 6-14 13-13"
        fill="none"
        stroke="#c94f3b"
        strokeWidth="2.600"
        strokeLinecap="round"
      />
      <g
        className={styles.waves}
        fill="none"
        stroke="#c94f3b"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M24-20c4 4 6 9 6 14" />
        <path d="M30-27c6 7 9 14 9 21" opacity="0.6" />
      </g>
    </svg>
  );
  if (!onAgain) return drawing;
  return (
    <button type="button" className={styles.listen} aria-label={text.hearAgain} onClick={onAgain}>
      {drawing}
    </button>
  );
}

function Picture({
  stimulus,
  sounding = false,
  part,
  solved = false,
  onAgain,
  place,
}: PictureProps) {
  switch (stimulus.type) {
    case 'picture':
      return (
        <span className={styles.frame} data-sounding={sounding}>
          <KitPicture id={stimulus.id} className={styles.picture} />
        </span>
      );
    case 'sound':
      return (
        <Shell
          clip={stimulus.clip}
          sounding={sounding}
          onAgain={place === 'prompt' ? onAgain : undefined}
        />
      );
    case 'letter':
      return (
        <span className={styles.tile} data-sounding={sounding} data-place={place}>
          <Letters letters={stimulus.letters} className={styles.letters} />
        </span>
      );
    case 'word': {
      const letters = lettersOf(stimulus.id);
      // Which sound is being said, where the saying of it is followed sound by sound.
      const at = sounding && part !== undefined && part < letters.length ? part : undefined;
      return (
        <span
          className={styles.word}
          data-sounding={sounding}
          data-word={stimulus.id}
          data-at={at}
          style={{ '--at': at ?? 0, '--of': Math.max(1, letters.length) } as CSSProperties}
        >
          {letters.map((letter, index) => (
            <span key={index} className={styles.tile} data-now={index === at}>
              <Letters letters={letter} className={styles.letters} />
            </span>
          ))}
          {/* A finger under the word while it is said slowly. */}
          <span className={styles.sweep} aria-hidden="true" />
        </span>
      );
    }
    case 'scene': {
      const scene = readReadingPicture(stimulus);
      switch (scene?.kind) {
        case 'rhyme':
          return <RhymeWord word={scene.word} sounding={sounding} />;
        case 'beats':
          return <BeatsWord word={scene.word} sounding={sounding} part={part} solved={solved} />;
        case 'claps':
          return <ClapCard count={scene.count} sounding={sounding} />;
        case 'sentence':
          // On the small card that stands for the activity there is room for two words at a size that can be
          // seen to be print: the whole line would be a hair's breadth high.
          return place === 'card' ? (
            <Sentence words={scene.words.slice(0, 2)} part={undefined} />
          ) : (
            <SentenceToRead words={scene.words} part={sounding ? part : undefined} />
          );
        case 'placed':
          return (
            <Placed thing={scene.thing} how={scene.how} base={scene.base} sounding={sounding} />
          );
        case undefined:
          return null;
      }
    }
    // Things other worlds draw: an amount, a sign.
    // eslint-disable-next-line no-fallthrough
    case 'quantity':
    case 'sign':
      return null;
  }
}

const text = {
  hearAgain: 'Hear it again',
  sound: 'Something to listen to',
  letter: (letters: string) => `The letter ${letters}`,
  // Spelt out, not read out: reading it is what is being asked.
  word: (letters: readonly string[]) => `A word to read: ${letters.join(', ')}`,
};

export function describe(stimulus: Stimulus): string {
  switch (stimulus.type) {
    case 'picture':
      return wordFor(stimulus.id);
    case 'sound':
      return text.sound;
    case 'letter':
      return text.letter(stimulus.letters);
    case 'word':
      return text.word(lettersOf(stimulus.id));
    case 'scene': {
      const scene = readReadingPicture(stimulus);
      return scene ? describeScene(scene) : '';
    }
    case 'quantity':
    case 'sign':
      return '';
  }
}

const readingCove: WorldModule = {
  Picture,
  describe,
  chooseScript,
  makeScript,
  soundOf,
  linesFor,
  voice,
};
export default readingCove;
