import { Guide, type GuideState } from './Guide';
import styles from './GuideSheet.module.css';

/**
 * Glim's character sheet: every state, the pointing directions, the guide afloat, on a pale and on a deep ground,
 * and the figure seen from the front, the side and behind. Not linked from the game: it is at /studio/guide, for
 * the art review and for docs/ART_DIRECTION.md.
 */

const STATES: readonly (readonly [GuideState, string])[] = [
  ['idle', 'Idle'],
  ['point', 'Point'],
  ['think', 'Think'],
  ['celebrate', 'Celebrate'],
  ['retry', 'Gentle retry'],
  ['wave', 'Hello'],
];

const INK = '#22304f';
const AMBER = '#e09a1f';
const BODY = 'M62 9c-2 11 28 29 29 63 1 26-13 41-31 41S28 98 29 72c1-26 25-38 24-54 0-5 4-9 9-9Z';

/** The figure seen from one side: for the sheet only. */
function Side() {
  return (
    <svg
      viewBox="-14 -16 148 164"
      className={styles.turn}
      role="img"
      aria-label="Glim from the side"
    >
      <path d="M40 90c-14 2-24 10-30 22l9 3c5-9 12-14 22-15Z" fill="#e2604a" />
      <path d="M40 94c-9 4-14 12-15 21l8 1c1-8 4-12 9-14Z" fill="#c94f3b" />
      <ellipse
        cx="62"
        cy="117"
        rx="13"
        ry="6.5"
        fill="#f0a63a"
        stroke="#b86a14"
        strokeWidth="1.6"
      />
      <path
        d="M58 9c-3 11 24 29 25 63 1 26-10 41-25 41S34 98 35 72c1-26 16-38 15-54 0-5 3-9 8-9Z"
        fill="#ffe27a"
        stroke={AMBER}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <ellipse
        cx="50"
        cy="52"
        rx="5"
        ry="11"
        fill="#fff"
        opacity="0.6"
        transform="rotate(-14 50 52)"
      />
      <path d="M36 86c10 10 36 10 47 0l1 9c-12 11-38 11-49 0Z" fill="#e2604a" />
      <path
        d="M36 90.5c10 10 36 10 47 0"
        fill="none"
        stroke="#fff1d6"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <ellipse cx="39" cy="92" rx="6" ry="5" fill="#c94f3b" />
      <ellipse cx="72" cy="62" rx="4" ry="7.2" fill={INK} />
      <circle cx="73.4" cy="59" r="1.7" fill="#fff" />
      <ellipse cx="76" cy="72" rx="4.4" ry="3.4" fill="#ff8f7a" opacity="0.6" />
      <path d="M72 74q5 4 9 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <g transform="rotate(-10 60 80)">
        <rect
          x="54"
          y="76"
          width="12"
          height="24"
          rx="6"
          fill="#ffd96a"
          stroke={AMBER}
          strokeWidth="2.2"
        />
        <circle cx="60" cy="102" r="8" fill="#ffe27a" stroke={AMBER} strokeWidth="2.2" />
      </g>
    </svg>
  );
}

/** The figure seen from behind: for the sheet only. */
function Back() {
  return (
    <svg viewBox="-14 -16 148 164" className={styles.turn} role="img" aria-label="Glim from behind">
      <ellipse
        cx="47"
        cy="117"
        rx="11"
        ry="6.5"
        fill="#f0a63a"
        stroke="#b86a14"
        strokeWidth="1.6"
      />
      <ellipse
        cx="73"
        cy="117"
        rx="11"
        ry="6.5"
        fill="#f0a63a"
        stroke="#b86a14"
        strokeWidth="1.6"
      />
      <g transform="rotate(16 34 80)">
        <rect
          x="28"
          y="76"
          width="12"
          height="24"
          rx="6"
          fill="#ffd96a"
          stroke={AMBER}
          strokeWidth="2.2"
        />
        <circle cx="34" cy="102" r="8" fill="#ffe27a" stroke={AMBER} strokeWidth="2.2" />
      </g>
      <g transform="rotate(-16 86 80)">
        <rect
          x="80"
          y="76"
          width="12"
          height="24"
          rx="6"
          fill="#ffd96a"
          stroke={AMBER}
          strokeWidth="2.2"
        />
        <circle cx="86" cy="102" r="8" fill="#ffe27a" stroke={AMBER} strokeWidth="2.2" />
      </g>
      <path
        d={BODY}
        fill="#ffdf70"
        stroke={AMBER}
        strokeWidth="2.5"
        strokeLinejoin="round"
        transform="translate(120 0) scale(-1 1)"
      />
      <path d="M31 86c13 10 45 10 58 0l1 9c-14 11-46 11-60 0Z" fill="#e2604a" />
      <path
        d="M31 90.5c13 10 45 10 58.5 0"
        fill="none"
        stroke="#fff1d6"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M56 98c-6 6-9 13-9 22l8 1c0-7 2-12 6-17Z" fill="#c94f3b" />
      <path d="M63 98c7 5 11 12 12 21l-8 2c-1-8-4-13-9-17Z" fill="#e2604a" />
      <ellipse cx="60" cy="98" rx="7" ry="5.5" fill="#c94f3b" />
    </svg>
  );
}

export default function GuideSheet() {
  return (
    <main className={styles.sheet} data-testid="guide-sheet">
      <h1>Glim — character sheet</h1>

      <section>
        <h2>States</h2>
        <ul className={styles.row}>
          {STATES.map(([state, label]) => (
            <li key={state} className={styles.card}>
              <Guide state={state} aim={state === 'point' ? 35 : 90} className={styles.big} />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Pointing, any way</h2>
        <ul className={styles.row}>
          {[180, 135, 90, 45, 0, -35].map((aim) => (
            <li key={aim} className={styles.card}>
              <Guide state="point" aim={aim} className={styles.mid} />
              <span>{aim}°</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Afloat, on water; and small</h2>
        <ul className={styles.row}>
          <li className={styles.card} data-ground="sea">
            <Guide state="point" aim={70} afloat className={styles.big} />
            <span>Afloat</span>
          </li>
          <li className={styles.card} data-ground="sea">
            <Guide state="wave" afloat className={styles.big} />
            <span>Afloat, hello</span>
          </li>
          <li className={styles.card} data-ground="deep">
            <Guide state="idle" className={styles.mid} />
            <span>On deep water</span>
          </li>
          <li className={styles.card} data-ground="paper">
            <Guide state="idle" className={styles.small} />
            <span>64 px</span>
          </li>
          <li className={styles.card} data-ground="paper">
            <Guide state="celebrate" className={styles.small} />
            <span>64 px</span>
          </li>
        </ul>
      </section>

      <section>
        <h2>Front, side, behind</h2>
        <ul className={styles.row}>
          <li className={styles.card}>
            <Guide state="idle" className={styles.big} />
            <span>Front</span>
          </li>
          <li className={styles.card}>
            <Side />
            <span>Side</span>
          </li>
          <li className={styles.card}>
            <Back />
            <span>Behind</span>
          </li>
        </ul>
      </section>
    </main>
  );
}
