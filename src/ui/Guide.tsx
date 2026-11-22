import { useId, type CSSProperties } from 'react';
import styles from './Guide.module.css';

/**
 * Glim, the guide: a small keeper of the lighthouse's light, in a scarf striped like the lighthouse itself.
 *
 * One drawing, rigged in parts (body, face, two arms, scarf, feet, a glow), with a pose and a motion for each thing
 * the guide has to say without words:
 *
 *   idle        breathing, blinking, waiting — nothing is being asked
 *   point       "look here": an arm out towards `aim`, and sparks of light travelling that way
 *   think       "hmm, which one?": eyes up, a hand to the chin, three thought bubbles
 *   celebrate   "yes!": a hop, both arms up, happy eyes, sparkles
 *   retry       "not that one — have another look": a gentle tilt of the head and a small nod. Never sad.
 *   wave        "hello"
 *
 * The pose alone carries the meaning, so with motion reduced the guide still says the same things, standing still.
 * The guide is decoration for assistive technology: whatever it shows is also in the text beside it.
 */
export type GuideState = 'idle' | 'point' | 'think' | 'celebrate' | 'retry' | 'wave';

const INK = '#22304f';
const AMBER = '#e09a1f';

/** A four-pointed spark, drawn about its own middle. */
const SPARK = 'M0-7 1.8-1.8 7 0 1.8 1.8 0 7-1.8 1.8-7 0-1.8-1.8Z';

export function Guide({
  state = 'idle',
  aim = 90,
  afloat = false,
  className,
}: {
  state?: GuideState;
  /** Where to point, in degrees: 0 is to the right, 90 straight up, 180 to the left. */
  aim?: number;
  /** In a rowing boat, on the water. */
  afloat?: boolean;
  className?: string;
}) {
  const id = useId();
  const body = `${id}-body`;
  const boat = `${id}-boat`;
  // The arm on the side being pointed to does the pointing. An arm hangs straight down at rest, so it turns
  // through the aim plus a quarter-turn; SVG angles run clockwise, hence the sign.
  const right = Math.cos((aim * Math.PI) / 180) >= 0;
  const turn = -(aim + 90);

  return (
    <span
      className={[styles.guide, className].filter(Boolean).join(' ')}
      data-state={state}
      data-side={right ? 'right' : 'left'}
      data-afloat={afloat || undefined}
      data-testid="guide"
      style={{ '--aim': `${String(turn)}deg`, '--beam': `${String(-aim)}deg` } as CSSProperties}
      aria-hidden="true"
    >
      <span className={styles.halo} />
      <span className={styles.bobber}>
        <svg viewBox="-14 -16 148 164" className={styles.figure} focusable="false">
          <defs>
            <radialGradient id={body} cx="0.42" cy="0.4" r="0.72">
              <stop offset="0" stopColor="#fffbe6" />
              <stop offset="0.55" stopColor="#ffe27a" />
              <stop offset="1" stopColor="#ffbe3d" />
            </radialGradient>
            <linearGradient id={boat} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff8f7a" />
              <stop offset="1" stopColor="#d9533f" />
            </linearGradient>
          </defs>

          {/* Sparks of light travelling the way the guide is pointing. */}
          <g className={styles.beam}>
            {[
              [108, 1.5],
              [130, 1.15],
              [148, 0.85],
            ].map(([x, size]) => (
              <g key={x} transform={`translate(${String(x)} 66) scale(${String(size)})`}>
                <path d={SPARK} />
              </g>
            ))}
          </g>

          <g className={styles.lean}>
            {/* The scarf's tail, behind the body, in the wind. */}
            <g className={styles.tail}>
              <path d="M82 89c12 1 22 8 27 20l-8 3c-4-8-11-13-20-13Z" fill="#e2604a" />
              <path d="M82 93c8 4 13 11 14 20l-7 1c-1-7-4-11-9-13Z" fill="#c94f3b" />
              <path
                d="M93 97.5 100.5 111"
                stroke="#fff1d6"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>

            <g className={styles.feet}>
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
            </g>

            <g className={styles.body}>
              <path
                d="M62 9c-2 11 28 29 29 63 1 26-13 41-31 41S28 98 29 72c1-26 25-38 24-54 0-5 4-9 9-9Z"
                fill={`url(#${body})`}
                stroke={AMBER}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <ellipse
                cx="44"
                cy="52"
                rx="6.5"
                ry="12"
                fill="#fff"
                opacity="0.6"
                transform="rotate(-18 44 52)"
              />

              {/* The scarf: the lighthouse's own coral and cream. */}
              <path d="M31 86c13 10 45 10 58 0l1 9c-14 11-46 11-60 0Z" fill="#e2604a" />
              <path
                d="M31 90.5c13 10 45 10 58.5 0"
                fill="none"
                stroke="#fff1d6"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <ellipse cx="85" cy="92" rx="6" ry="5" fill="#c94f3b" />

              <g className={styles.face}>
                <ellipse cx="39.5" cy="72" rx="5.5" ry="3.6" fill="#ff8f7a" opacity="0.6" />
                <ellipse cx="80.5" cy="72" rx="5.5" ry="3.6" fill="#ff8f7a" opacity="0.6" />

                <g className={styles.eyesOpen}>
                  <g className={styles.blink}>
                    <ellipse cx="48" cy="62" rx="5.2" ry="7.2" fill={INK} />
                    <ellipse cx="72" cy="62" rx="5.2" ry="7.2" fill={INK} />
                    <circle cx="49.8" cy="59" r="1.9" fill="#fff" />
                    <circle cx="73.8" cy="59" r="1.9" fill="#fff" />
                  </g>
                </g>
                <g
                  className={styles.brows}
                  fill="none"
                  stroke={INK}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M42.5 51.5q5-3.5 10-1" />
                  <path d="M77.5 51.5q-5-3.5-10-1" />
                </g>
                <g
                  className={styles.eyesHappy}
                  fill="none"
                  stroke={INK}
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <path d="M42.5 64q5.5-8.5 11 0" />
                  <path d="M66.5 64q5.5-8.5 11 0" />
                </g>

                <path
                  className={styles.mouthSmile}
                  d="M54 72.5q6 6 12 0"
                  fill="none"
                  stroke={INK}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
                <g className={styles.mouthOpen}>
                  <path
                    d="M53 72q7 13 14 0Z"
                    fill={INK}
                    stroke={INK}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <ellipse cx="60" cy="78" rx="3.4" ry="2.2" fill="#ff8f7a" />
                </g>
                <ellipse
                  className={styles.mouthSmall}
                  cx="61"
                  cy="75"
                  rx="2.8"
                  ry="2.4"
                  fill={INK}
                />
                <path
                  className={styles.mouthSoft}
                  d="M55 73.5q5 3.5 10 0"
                  fill="none"
                  stroke={INK}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              </g>
            </g>

            {/* Arms hang from the shoulders and turn about them; each ends in a mitten of a hand. */}
            <g className={styles.armLeft}>
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
            <g className={styles.armRight}>
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
          </g>

          {/* The boat, in front of the guide's feet. */}
          <g className={styles.boat}>
            <ellipse cx="60" cy="133" rx="62" ry="9" fill="#fff" opacity="0.5" />
            <path
              d="M6 106q54 26 108 0l-9 22q-45 16-90 0Z"
              fill={`url(#${boat})`}
              stroke="#b8432f"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M6 106q54 26 108 0"
              fill="none"
              stroke="#fff1d6"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M22 133q38 9 76 0"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.8"
            />
          </g>

          <g className={styles.thoughts} fill="#fff" stroke="#8792ac" strokeWidth="1.5">
            <circle cx="93" cy="30" r="3.2" />
            <circle cx="103" cy="18" r="4.4" />
            <circle cx="116" cy="4" r="5.6" />
          </g>

          <g className={styles.sparkles}>
            {[
              [8, 28, 1.5],
              [112, 20, 1.8],
              [-4, 78, 1.2],
              [126, 70, 1.3],
              [60, -10, 1.6],
            ].map(([x, y, size]) => (
              <g
                key={`${String(x)}-${String(y)}`}
                transform={`translate(${String(x)} ${String(y)}) scale(${String(size)})`}
              >
                <path d={SPARK} />
              </g>
            ))}
          </g>
        </svg>
      </span>
    </span>
  );
}
