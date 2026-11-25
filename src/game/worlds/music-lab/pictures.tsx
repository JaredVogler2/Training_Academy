import type { ReactNode } from 'react';
import { barLength, type Voice } from './phrases';
import styles from './musicLab.module.css';

/**
 * The Music Lab's drawings: chime bars, the ones who play and sing, and the signs that stand for what is asked.
 *
 * A chime bar shows its pitch — a low bar is a long bar, as it is on a real instrument — because that is true and
 * worth learning. The birds do not: every bird is the same bird, so that a question about what they sang can only
 * be answered by listening.
 */

const INK = '#22304f';

/** One colour for each note of the scale, and a deeper one for its rim. */
export const BAR_COLOURS: Readonly<Record<string, readonly [string, string]>> = {
  c: ['#f0564a', '#b83a30'],
  d: ['#ff9f45', '#c46a17'],
  e: ['#ffd35c', '#c88a00'],
  f: ['#6fcf74', '#2f8440'],
  g: ['#62b4f3', '#2a6fb5'],
  a: ['#a993f8', '#6b4fd0'],
  b: ['#f58fc2', '#a8327a'],
};

/** Rings of sound coming off whatever is playing. They are there only while it plays. */
function Ringing({ x, y }: { x: number; y: number }) {
  return (
    <g
      className={styles.ringing}
      fill="none"
      stroke="#a8327a"
      strokeWidth="3"
      strokeLinecap="round"
      transform={`translate(${String(x)} ${String(y)})`}
    >
      <path d="M0-9c4 3 6 6 6 9s-2 6-6 9" />
      <path d="M7-15c7 5 10 10 10 15s-3 10-10 15" opacity="0.55" />
    </g>
  );
}

/** A chime bar on its two pins, as long as its note is low. */
export function Bar({ note, sounding = false }: { note: string; sounding?: boolean }) {
  const [fill, rim] = BAR_COLOURS[note[0] ?? 'c'] ?? ['#f0564a', '#b83a30'];
  const tall = Math.round(barLength(note) * 104);
  return (
    <svg
      className={styles.bar}
      viewBox="-26 -58 52 116"
      aria-hidden="true"
      focusable="false"
      data-note={note}
      data-sounding={sounding}
    >
      <rect
        className={styles.barBody}
        x="-17"
        y={-tall / 2}
        width="34"
        height={tall}
        rx="11"
        fill={fill}
        stroke={rim}
        strokeWidth="4"
      />
      <path
        d={`M-8 ${String(-tall / 2 + 12)}v${String(Math.max(8, tall * 0.34))}`}
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cy={-tall / 2 + 12} r="3.200" fill={rim} />
      <circle cy={tall / 2 - 12} r="3.200" fill={rim} />
    </svg>
  );
}

/** A bird that sings. Every small one is the same; the big one, whose tune is to be found again, has a crest. */
function Bird({ big, sounding }: { big: boolean; sounding: boolean }) {
  const [body, wing, rim] = big
    ? ['#a993f8', '#6b4fd0', '#6b4fd0']
    : ['#ffd35c', '#f0a92a', '#c88a00'];
  return (
    <>
      <ellipse cy="33" rx="22" ry="3.500" fill={INK} opacity="0.1" />
      <path d="M-9 26v7M5 26v7" stroke="#c46a17" strokeWidth="3.500" strokeLinecap="round" />
      <path d="M-22 6-36-2l4 16z" fill={wing} />
      <circle r="27" fill={body} stroke={rim} strokeWidth="3" />
      <path d="M-18 4c4 12 16 16 26 8-6-10-16-14-26-8z" fill={wing} />
      {big && <path d="M-6-25c-2-9 2-14 8-14-1 5 2 8 6 9z" fill={wing} />}
      <circle cx="11" cy="-9" r="6.500" fill="#fff" />
      <circle cx="12.500" cy="-8.500" r="3.200" fill={INK} />
      {sounding ? (
        // Singing: the beak is open.
        <>
          <path d="M24-6 40-14 27 0z" fill="#ff9f45" stroke="#c46a17" strokeWidth="2" />
          <path d="M25 3 37 8 24 9z" fill="#ff9f45" stroke="#c46a17" strokeWidth="2" />
        </>
      ) : (
        <path d="M24-5 39 0 24 6z" fill="#ff9f45" stroke="#c46a17" strokeWidth="2" />
      )}
    </>
  );
}

/** A drum on its stand, with two sticks. The big one is the one whose pattern is to be found again. */
function Drum({ big, sounding }: { big: boolean; sounding: boolean }) {
  const [side, rim] = big ? ['#a993f8', '#6b4fd0'] : ['#ff8f7a', '#c94f3b'];
  return (
    <>
      <ellipse cy="33" rx="26" ry="3.500" fill={INK} opacity="0.1" />
      <path d="M-24-4v24c0 6 11 10 24 10s24-4 24-10V-4z" fill={side} stroke={rim} strokeWidth="3" />
      <path d="M-24 8 0 20 24 8M-24 20 0 8 24 20" fill="none" stroke="#fff" strokeWidth="2.400" />
      <ellipse cy="-4" rx="24" ry="9" fill="#fff6e3" stroke={rim} strokeWidth="3" />
      <g
        className={styles.sticks}
        stroke="#7a5236"
        strokeWidth="4"
        strokeLinecap="round"
        data-down={sounding}
      >
        <path d="M-30-30-8-8" />
        <path d="M30-30 8-8" />
      </g>
    </>
  );
}

/** Three chime bars and a beater: someone who plays a tune on bars. */
function Chimes({ big }: { big: boolean }) {
  const bars: readonly (readonly [number, number, string])[] = [
    [-22, 46, 'c'],
    [-6, 38, 'e'],
    [10, 30, 'g'],
  ];
  return (
    <>
      <ellipse cy="33" rx="26" ry="3.500" fill={INK} opacity="0.1" />
      <path d="M-30 24 30 16M-30-14 30-8" stroke="#9a6a45" strokeWidth="5" strokeLinecap="round" />
      {bars.map(([x, tall, letter]) => {
        const [fill, rim] = BAR_COLOURS[letter] ?? ['#f0564a', '#b83a30'];
        return (
          <rect
            key={x}
            x={x}
            y={4 - tall / 2}
            width="12"
            height={tall}
            rx="5"
            fill={fill}
            stroke={rim}
            strokeWidth="2.400"
          />
        );
      })}
      <path d="M34-30 14-6" stroke="#7a5236" strokeWidth="3.600" strokeLinecap="round" />
      <circle cx="35" cy="-31" r={big ? 7 : 5.5} fill="#a993f8" stroke="#6b4fd0" strokeWidth="2" />
    </>
  );
}

/** One who plays or sings: a bird, a drum, or chime bars with a beater. */
export function Player({
  voice,
  big = false,
  sounding = false,
}: {
  voice: Voice;
  big?: boolean;
  sounding?: boolean;
}) {
  return (
    <svg
      className={styles.player}
      viewBox="-44 -44 88 84"
      aria-hidden="true"
      focusable="false"
      data-voice={voice}
      data-big={big || undefined}
      data-sounding={sounding}
    >
      <g transform={big ? undefined : 'translate(0 4) scale(0.82)'}>
        {voice === 'drum' ? (
          <Drum big={big} sounding={sounding} />
        ) : voice === 'bar' ? (
          <Chimes big={big} />
        ) : (
          <Bird big={big} sounding={sounding} />
        )}
      </g>
      {sounding && <Ringing x={voice === 'pipe' ? 30 : 26} y={voice === 'pipe' ? -22 : -26} />}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Signs: what is being asked, as a picture
// ---------------------------------------------------------------------------------------------------------------------

const DOT = '#a8327a';

function dots(points: readonly (readonly [number, number])[], joined = true): ReactNode {
  return (
    <>
      {joined && (
        <path
          d={`M${points.map(([x, y]) => `${String(x)} ${String(y)}`).join('L')}`}
          fill="none"
          stroke="#f58fc2"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {points.map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r="6.500" fill={DOT} />
      ))}
    </>
  );
}

const SIGNS: Readonly<Record<string, () => ReactNode>> = {
  // "The high one": an arrow going up to a small note at the top.
  high: () => (
    <>
      <path d="M-22 26h44" stroke="#9a6a45" strokeWidth="5" strokeLinecap="round" />
      <path d="M0 22V-8" stroke="#f58fc2" strokeWidth="6" strokeLinecap="round" />
      <path d="M-11-6 0-20 11-6z" fill="#f58fc2" />
      <circle cy="-27" r="5" fill={DOT} />
    </>
  ),
  // "The low one": an arrow going down to a big note at the bottom.
  low: () => (
    <>
      <path d="M-22-28h44" stroke="#9a6a45" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
      <path d="M0-24V2" stroke="#f58fc2" strokeWidth="6" strokeLinecap="round" />
      <path d="M-11 0 0 14 11 0z" fill="#f58fc2" />
      <circle cy="24" r="8" fill={DOT} />
    </>
  ),
  // Two that match.
  same: () => (
    <>
      <circle cx="-15" r="12" fill="#ffd35c" stroke="#c88a00" strokeWidth="4" />
      <circle cx="15" r="12" fill="#ffd35c" stroke="#c88a00" strokeWidth="4" />
    </>
  ),
  // Two that do not.
  different: () => (
    <>
      <circle cx="-15" r="12" fill="#ffd35c" stroke="#c88a00" strokeWidth="4" />
      <path
        d="M15-13 29 11H1z"
        fill="#62b4f3"
        stroke="#2a6fb5"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </>
  ),
  up: () =>
    dots([
      [-22, 18],
      [0, 0],
      [22, -18],
    ]),
  down: () =>
    dots([
      [-22, -18],
      [0, 0],
      [22, 18],
    ]),
  hill: () =>
    dots([
      [-24, 16],
      [-10, -8],
      [4, -18],
      [16, -4],
      [26, 16],
    ]),
  // The same little thing, and then the same again.
  twice: () => (
    <>
      {dots(
        [
          [-27, 10],
          [-13, -10],
        ],
        true,
      )}
      {dots(
        [
          [9, 10],
          [23, -10],
        ],
        true,
      )}
    </>
  ),
  // Wherever it goes, it ends on the biggest bar.
  home: () => (
    <>
      {dots(
        [
          [-24, -8],
          [-8, -20],
          [6, -2],
        ],
        true,
      )}
      <path d="M6-2 20 12" stroke="#f58fc2" strokeWidth="4" strokeLinecap="round" />
      <rect
        x="13"
        y="-6"
        width="15"
        height="34"
        rx="6"
        fill="#f0564a"
        stroke="#b83a30"
        strokeWidth="3"
      />
    </>
  ),
};

export function isSign(id: string): boolean {
  return Object.hasOwn(SIGNS, id);
}

export function Sign({ id }: { id: string }) {
  const draw = SIGNS[id];
  if (!draw) return null;
  return (
    <svg
      className={styles.sign}
      viewBox="-34 -34 68 68"
      aria-hidden="true"
      focusable="false"
      data-sign={id}
    >
      {draw()}
    </svg>
  );
}

/** A beat: a drum, and over it one round light for each beat. */
export function BeatPicture({ beats }: { beats: number }) {
  const shown = Math.min(beats, 4);
  return (
    <svg className={styles.player} viewBox="-44 -44 88 84" aria-hidden="true" focusable="false">
      <g transform="translate(0 10) scale(0.8)">
        <Drum big={false} sounding={false} />
      </g>
      {Array.from({ length: shown }, (_, index) => (
        <circle
          key={index}
          cx={(index - (shown - 1) / 2) * 17}
          cy="-33"
          r="5.500"
          fill={index === 0 ? '#ffd35c' : '#fff'}
          stroke="#a8327a"
          strokeWidth="2.400"
        />
      ))}
    </svg>
  );
}
