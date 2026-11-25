import { useId } from 'react';
import { LetterStrokes, lettersWidth } from '@/art/letters';
import { PICTURES, isPictureId, wordFor } from '@/art/pictures';
import { sentenceFor, type Placing, type ReadingPicture } from '@/engine';
import { CLAP_GAP } from './clips';
import { useUprightPhone } from './screen';
import { beatsIn } from './words';
import styles from './readingCove.module.css';

/**
 * The pictures only Reading Cove draws, for the questions that came after its first ones: a word to find a rhyme
 * for, a word to clap and the cards of claps to answer with, a sentence in print, and what a sentence tells of —
 * one thing on another, or in it.
 */

const INK = '#22304f';

const shadow = <ellipse cy="29" rx="20" ry="3.500" fill={INK} opacity="0.08" />;
const drawingOf = (id: string) => (isPictureId(id) ? PICTURES[id].draw : null);

// ---------------------------------------------------------------------------------------------------------------------
// Rhyme
// ---------------------------------------------------------------------------------------------------------------------

/**
 * A word to find a rhyme for: its picture, and under it a line in two parts, a short pale one and a long bright
 * one. The bright part is the end of the word, which is what this question is about; it swells while the word is
 * said.
 */
export function RhymeWord({ word, sounding }: { word: string; sounding: boolean }) {
  return (
    <span className={styles.frame} data-sounding={sounding}>
      <svg
        className={styles.picture}
        viewBox="-34 -34 68 82"
        aria-hidden="true"
        focusable="false"
        data-picture={word}
        data-rhyme-with={word}
      >
        {shadow}
        {drawingOf(word)}
        <path d="M-25 41h11" fill="none" stroke="#c9d3ea" strokeWidth="6" strokeLinecap="round" />
        <path
          className={styles.ending}
          d="M-5 41h30"
          fill="none"
          stroke="#ef7b5a"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------------------------------------------------

/**
 * One clap: two hands meeting, and the little lines of the sound they make. It is the mark a clap leaves under a
 * word and the mark on the cards that are chosen from. (It was a spark at first: a round middle with rays, which
 * beside the picture of the sun was a second, smaller sun.)
 */
function Clap({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)}) scale(${String(size)})`}>
      <path
        d="M0-8.500V-12M-5.500-7l-2.500-2.500M5.500-7l2.500-2.500"
        fill="none"
        stroke="#f5a623"
        strokeWidth="2.200"
        strokeLinecap="round"
      />
      <ellipse
        cx="-3.600"
        cy="2.500"
        rx="4.400"
        ry="8.400"
        transform="rotate(24 -3.600 2.500)"
        fill="#e8b98c"
      />
      <ellipse
        cx="3.600"
        cy="2.500"
        rx="4.400"
        ry="8.400"
        transform="rotate(-24 3.600 2.500)"
        fill="#f2c9a0"
      />
    </g>
  );
}

/** How far apart the claps under a word stand. */
const CLAP_STEP = 21;

/**
 * A word to clap: its picture, and under it a clap for each beat that has been clapped so far. None is drawn
 * until it is clapped, and while they are coming they start from the same place on the left whatever the word, so
 * that neither how many there will be nor where the row will end can be read off before the last of them. Once
 * the question has been answered they all stand, in the middle.
 */
export function BeatsWord({
  word,
  sounding,
  part,
  solved,
}: {
  word: string;
  sounding: boolean;
  part: number | undefined;
  solved: boolean;
}) {
  const beats = beatsIn(word);
  const clapped = solved ? beats : sounding && part !== undefined ? Math.min(beats, part + 1) : 0;
  const first = solved ? (-(beats - 1) * CLAP_STEP) / 2 : -CLAP_STEP;
  return (
    <span className={styles.frame} data-sounding={sounding && part === undefined}>
      <svg
        className={styles.picture}
        viewBox="-34 -34 68 88"
        aria-hidden="true"
        focusable="false"
        data-picture={word}
        data-clap-word={word}
        data-clapped={clapped}
      >
        <g className={styles.clapped} key={sounding && part !== undefined ? part : 'still'}>
          {shadow}
          {drawingOf(word)}
        </g>
        {Array.from({ length: clapped }, (_, index) => (
          <g
            key={index}
            className={styles.clap}
            data-clap={index}
            data-now={!solved && index === part}
          >
            <Clap x={first + index * CLAP_STEP} y={42} />
          </g>
        ))}
      </svg>
    </span>
  );
}

/** A card with so many claps on it. While it is being played, each claps in its turn. */
export function ClapCard({ count, sounding }: { count: number; sounding: boolean }) {
  return (
    <span className={styles.frame}>
      <svg
        className={styles.picture}
        viewBox="-44 -27 88 50"
        aria-hidden="true"
        focusable="false"
        data-claps={count}
        data-sounding={sounding}
      >
        {Array.from({ length: count }, (_, index) => (
          <g
            key={index}
            className={styles.clap}
            data-clap={index}
            style={{ animationDelay: `${String(index * CLAP_GAP)}ms` }}
          >
            <Clap x={(index - (count - 1) / 2) * 28} y={0} size={1.3} />
          </g>
        ))}
      </svg>
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// A sentence
// ---------------------------------------------------------------------------------------------------------------------

const WORD_GAP = 24;
/** How far below the first line of a sentence the second one sits, where it has two. */
const LINE = 78;

/**
 * Where each word of a sentence stands: its middle, its width and which line it is on, on the grid letters are
 * drawn on, and the room the whole of it takes. On two lines the first two words are above ("a cat") and the
 * rest below ("on a mat"); both lines start at the same place, as lines of print do.
 */
export function wordPlaces(
  words: readonly string[],
  lines: 1 | 2 = 1,
): {
  places: { middle: number; width: number; line: number }[];
  width: number;
  height: number;
} {
  const second = lines === 2 && words.length > 3 ? 2 : words.length;
  let x = 0;
  let widest = 0;
  const places = words.map((word, index) => {
    if (index === second) x = 0;
    const width = lettersWidth(word);
    const place = { middle: x + width / 2, width, line: index < second ? 0 : 1 };
    x += width + WORD_GAP;
    widest = Math.max(widest, x - WORD_GAP);
    return place;
  });
  return { places, width: widest, height: 86 + (second < words.length ? LINE : 0) };
}

/**
 * A sentence in print: its words in the letters a child is taught to write, all at one size, on one line or on
 * two. While it is read aloud a finger stands under the word that is being read. At any other time there is no
 * finger: it is the reader's own to follow with.
 */
export function Sentence({
  words,
  part,
  lines = 1,
}: {
  words: readonly string[];
  part: number | undefined;
  lines?: 1 | 2;
}) {
  const { places, width, height } = wordPlaces(words, lines);
  const reading = part !== undefined && part < words.length ? part : null;
  return (
    <span
      className={styles.sentence}
      data-sentence={words.join(' ')}
      data-reading={reading ?? -1}
      data-lines={lines}
    >
      <svg
        className={styles.print}
        viewBox={`-8 -46 ${String(width + 16)} ${String(height)}`}
        aria-hidden="true"
        focusable="false"
      >
        {words.map((word, index) => {
          const place = places[index];
          if (!place) return null;
          return (
            <g
              key={index}
              transform={`translate(${String(place.middle)} ${String(place.line * LINE)})`}
              data-token={index}
              data-line={place.line}
              data-read={reading === index}
            >
              <LetterStrokes letters={word} />
            </g>
          );
        })}
        {places.map((place, index) =>
          reading === index ? (
            <path
              key={index}
              className={styles.finger}
              d={`M${String(place.middle - place.width / 2)} ${String(30 + place.line * LINE)}h${String(place.width)}`}
              fill="none"
              stroke="#ef7b5a"
              strokeWidth="7"
              strokeLinecap="round"
              data-finger={index}
            />
          ) : null,
        )}
      </svg>
    </span>
  );
}

/**
 * A sentence as it is asked about: on one line where the screen has the width for it, and on two on a phone held
 * upright, where one line of five words would have letters too small to read (at 320 points across, a small
 * letter 10 pixels high).
 */
export function SentenceToRead({
  words,
  part,
}: {
  words: readonly string[];
  part: number | undefined;
}) {
  const upright = useUprightPhone();
  return <Sentence words={words} part={part} lines={upright ? 2 : 1} />;
}

// ---------------------------------------------------------------------------------------------------------------------
// One thing on another, or in it
// ---------------------------------------------------------------------------------------------------------------------

/** The room each thing takes on the kit's grid: left, top, right, bottom. */
const BOX: Readonly<Record<string, readonly [number, number, number, number]>> = {
  cat: [-22, -24, 24, 26],
  hat: [-28, -11, 28, 20],
  hen: [-24, -23, 31, 27],
  cap: [-22, -11, 30, 14],
  pen: [-26, -23, 27, 24],
  pin: [-22, -23, 23, 24],
  rat: [-26, -15, 30, 20],
  pan: [-26, -23, 28, 16],
  man: [-23, -28, 23, 28],
  cup: [-22, -16, 26, 22],
};

/** The point a thing is held by, where that is not the middle of its foot: a pen by its nib, a pin by its point. */
const HELD_BY: Readonly<Record<string, readonly [number, number]>> = {
  pen: [-19, 23],
  pin: [-22, 24],
};

interface Place {
  /** Where on the thing underneath the other one rests. */
  at: readonly [number, number];
  /** How large the thing put there is drawn, beside the thing it is put on. */
  scale: number;
  /** The thing is put there by its middle, not by its foot: lying in a pan seen from above. */
  byMiddle?: boolean;
  /** What of the thing shows, where part of it is hidden: all that is above the near edge of a cup. */
  shows?: string;
}

/** On top of each thing that something is put on: where, and how large. */
const ON: Readonly<Record<string, Place>> = {
  mat: { at: [0, 7], scale: 0.66 },
  hut: { at: [0, -21], scale: 0.5 },
  man: { at: [0, -24], scale: 0.5 },
  cat: { at: [-2, -19], scale: 0.52 },
  hat: { at: [0, -8], scale: 0.6 },
  cot: { at: [0, 12], scale: 0.58 },
  map: { at: [0, 8], scale: 0.6 },
  rat: { at: [9, -7], scale: 0.42 },
};

/** Inside each thing that something is put in. */
const IN: Readonly<Record<string, Place>> = {
  // Standing in the doorway.
  hut: { at: [0, 24], scale: 0.42 },
  // Standing in it, with the near side of the cup in front.
  cup: { at: [-2, -3], scale: 0.6, shows: 'M-70-99H70V-12H14A16 4 0 0 1-18-12H-70z' },
  // Lying in it: the pan is seen from above.
  pan: { at: [-7, -4], scale: 0.5, byMiddle: true },
};

const placeFor = (how: Placing, base: string): Place | undefined => (how === 'on' ? ON : IN)[base];

/** Whether there is a way to draw this thing on, or in, that one. */
export function canPlace(thing: string, how: Placing, base: string): boolean {
  return (
    isPictureId(thing) &&
    isPictureId(base) &&
    BOX[thing] !== undefined &&
    placeFor(how, base) !== undefined
  );
}

/** Where a thing put on or in another is drawn, and the room the two of them take together. */
export function placing(
  thing: string,
  how: Placing,
  base: string,
): {
  move: readonly [number, number];
  scale: number;
  box: [number, number, number, number];
} | null {
  const place = placeFor(how, base);
  const room = BOX[thing];
  if (!place || !room) return null;
  const [left, top, right, bottom] = room;
  const held = place.byMiddle
    ? ([(left + right) / 2, (top + bottom) / 2] as const)
    : (HELD_BY[thing] ?? ([(left + right) / 2, bottom] as const));
  const move = [place.at[0] - place.scale * held[0], place.at[1] - place.scale * held[1]] as const;
  // The thing underneath has its usual square; the picture grows only as far as the other one reaches out of it.
  const box: [number, number, number, number] = [
    Math.min(-34, move[0] + place.scale * left - 2),
    Math.min(-34, move[1] + place.scale * top - 2),
    Math.max(34, move[0] + place.scale * right + 2),
    34,
  ];
  return { move, scale: place.scale, box };
}

/**
 * What a sentence tells of: a cat on a mat, a hen in a hut. The thing underneath is the kit's own picture of it;
 * the other is the kit's picture too, smaller, put where it would rest. Nothing is drawn for a pair there is no
 * way to put together, and the content tests ask for every pair the sentences use.
 */
export function Placed({
  thing,
  how,
  base,
  sounding,
}: {
  thing: string;
  how: Placing;
  base: string;
  sounding: boolean;
}) {
  const clipId = useId();
  const where = placing(thing, how, base);
  if (!where || !canPlace(thing, how, base)) return null;
  const [left, top, right, bottom] = where.box;
  const clip = placeFor(how, base)?.shows;
  const moved = `translate(${String(where.move[0])} ${String(where.move[1])}) scale(${String(where.scale)})`;
  return (
    <span className={styles.frame} data-sounding={sounding}>
      <svg
        className={styles.picture}
        viewBox={`${String(left)} ${String(top)} ${String(right - left)} ${String(bottom - top)}`}
        aria-hidden="true"
        focusable="false"
        data-placed={sentenceFor({ thing, how, base }).join(' ')}
      >
        {shadow}
        <g data-base={base}>{drawingOf(base)}</g>
        {clip ? (
          <>
            <clipPath id={clipId}>
              <path d={clip} />
            </clipPath>
            <g clipPath={`url(#${clipId})`}>
              <g transform={moved} data-thing={thing}>
                {drawingOf(thing)}
              </g>
            </g>
          </>
        ) : (
          <g transform={moved} data-thing={thing}>
            {drawingOf(thing)}
          </g>
        )}
      </svg>
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// In words
// ---------------------------------------------------------------------------------------------------------------------

const CLAPS = ['no claps', 'one clap', 'two claps', 'three claps'];

/** One of these pictures in words, for a screen reader. */
export function describeScene(scene: ReadingPicture): string {
  switch (scene.kind) {
    case 'rhyme':
      return `A word to find a rhyme for: ${wordFor(scene.word)}`;
    case 'beats':
      return `A word to clap: ${wordFor(scene.word)}`;
    case 'claps':
      return CLAPS[scene.count] ?? `${String(scene.count)} claps`;
    case 'sentence':
      // Spelt out, not read out: reading it is what is being asked.
      return `A sentence to read: ${scene.words.map((word) => Array.from(word).join(', ')).join('; ')}`;
    case 'placed':
      return `A picture: ${sentenceFor(scene).join(' ')}`;
  }
}
