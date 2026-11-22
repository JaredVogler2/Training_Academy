import { useId } from 'react';
import styles from './IllustratedHub.module.css';

/**
 * Academy Isle, drawn in vector. It is what the hub shows the instant the page opens, and what it keeps showing when
 * WebGL is missing, switched off, lost, or slow to arrive — so the "fallback" is a path every visit exercises.
 *
 * The drawing's box (`viewBox`) is fitted inside the free part of the screen; sky and sea are drawn far beyond that
 * box and allowed to overflow it, so they fill whatever shape of screen there is while the island stays whole.
 *
 * Decorative: the worlds are reached through the labelled buttons beside it, never through this picture.
 */

const HORIZON = 330;

function Tree({ x, y, r, tone = 0 }: { x: number; y: number; r: number; tone?: number }) {
  const dark = ['#3f9f54', '#4aa85a', '#369a5c'][tone % 3];
  const mid = ['#5fbf64', '#6fcf74', '#57c07a'][tone % 3];
  const light = ['#8fdc86', '#9be48f', '#8fe0a0'][tone % 3];
  return (
    <g>
      <ellipse
        cx={x + r * 0.2}
        cy={y + r * 1.02}
        rx={r * 0.95}
        ry={r * 0.22}
        fill="#22304f"
        opacity="0.12"
      />
      <rect
        x={x - r * 0.12}
        y={y + r * 0.2}
        width={r * 0.24}
        height={r * 0.85}
        rx={r * 0.1}
        fill="#8a5f3f"
      />
      <circle cx={x} cy={y} r={r} fill={dark} />
      <circle cx={x - r * 0.18} cy={y - r * 0.2} r={r * 0.78} fill={mid} />
      <circle cx={x - r * 0.36} cy={y - r * 0.42} r={r * 0.36} fill={light} />
    </g>
  );
}

function Pine({ x, y, h }: { x: number; y: number; h: number }) {
  const w = h * 0.5;
  return (
    <g>
      <rect x={x - h * 0.05} y={y - h * 0.12} width={h * 0.1} height={h * 0.16} fill="#8a5f3f" />
      <path
        d={`M${x - w} ${y - h * 0.1}L${x} ${y - h * 0.62}L${x + w} ${y - h * 0.1}z`}
        fill="#2f8f5b"
      />
      <path
        d={`M${x - w * 0.8} ${y - h * 0.38}L${x} ${y - h * 0.84}L${x + w * 0.8} ${y - h * 0.38}z`}
        fill="#3aa068"
      />
      <path
        d={`M${x - w * 0.56} ${y - h * 0.64}L${x} ${y - h}L${x + w * 0.56} ${y - h * 0.64}z`}
        fill="#4bb277"
      />
    </g>
  );
}

function Cloud({ x, y, s, className }: { x: number; y: number; s: number; className?: string }) {
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <ellipse cx="0" cy="14" rx="62" ry="15" fill="#dfeffb" />
        <circle cx="-30" cy="4" r="20" fill="#fff" />
        <circle cx="-2" cy="-10" r="28" fill="#fff" />
        <circle cx="30" cy="2" r="22" fill="#fff" />
        <ellipse cx="0" cy="10" rx="56" ry="14" fill="#fff" />
      </g>
    </g>
  );
}

export function IllustratedHub() {
  const sky = useId();
  const sea = useId();
  const glow = useId();
  const hill = useId();
  const tower = useId();

  return (
    <svg
      className={styles.scene}
      viewBox="118 64 564 446"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={sky}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="-260"
          x2="0"
          y2={HORIZON}
        >
          <stop offset="0" stopColor="#6dbdea" />
          <stop offset="0.62" stopColor="#b4e0f5" />
          <stop offset="1" stopColor="#fdecc8" />
        </linearGradient>
        <linearGradient id={sea} gradientUnits="userSpaceOnUse" x1="0" y1={HORIZON} x2="0" y2="900">
          <stop offset="0" stopColor="#c4eee6" />
          <stop offset="0.16" stopColor="#7fd6d2" />
          <stop offset="0.45" stopColor="#45b9c7" />
          <stop offset="1" stopColor="#2b82b0" />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#fff3b8" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff3b8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={hill} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a6e283" />
          <stop offset="0.55" stopColor="#84cf6b" />
          <stop offset="1" stopColor="#5fb35c" />
        </linearGradient>
        <clipPath id={tower}>
          <path d="M377 306 385 186h30l8 120z" />
        </clipPath>
      </defs>

      {/* Sky and sea reach far past the drawing's box. */}
      <rect x="-4000" y="-4000" width="8800" height={4000 + HORIZON} fill={`url(#${sky})`} />
      <circle cx="205" cy="128" r="120" fill={`url(#${glow})`} />
      <circle cx="205" cy="128" r="40" fill="#ffe27a" />
      <Cloud x={560} y={118} s={0.95} className={styles.cloudA} />
      <Cloud x={318} y={170} s={0.6} className={styles.cloudB} />
      <Cloud x={720} y={214} s={0.7} className={styles.cloudA} />
      <Cloud x={60} y={236} s={0.75} className={styles.cloudB} />
      <g
        className={styles.birds}
        fill="none"
        stroke="#4d5b7c"
        strokeWidth="2.600"
        strokeLinecap="round"
      >
        <path d="M500 196q7-8 13 0 6-8 13 0" />
        <path d="M534 180q5-6 10 0 5-6 10 0" />
      </g>

      <rect x="-4000" y={HORIZON} width="8800" height="4000" fill={`url(#${sea})`} />
      {/* The rest of the archipelago, far off: where the other worlds will be. */}
      <g opacity="0.82">
        <path d="M150 331c14-18 42-24 66-14 12 5 20 9 26 14z" fill="#9ed6c4" />
        <path d="M596 331c10-13 30-17 46-10 9 4 14 7 18 10z" fill="#a9dccb" />
        <path d="M-40 331c18-22 60-26 92-10 8 4 14 7 18 10z" fill="#a9dccb" />
        <path d="M748 331c20-20 56-22 82-8 6 3 10 6 13 8z" fill="#9ed6c4" />
      </g>
      <rect x="-4000" y={HORIZON - 3} width="8800" height="9" fill="#fff" opacity="0.4" />

      <g className={styles.ripples} fill="none" stroke="#fff" strokeLinecap="round" opacity="0.6">
        <path d="M150 372q12-6 24 0t24 0" strokeWidth="3" />
        <path d="M610 360q10-5 20 0t20 0" strokeWidth="3" />
        <path d="M40 420q14-7 28 0t28 0" strokeWidth="3.500" />
        <path d="M700 408q12-6 24 0t24 0" strokeWidth="3.500" />
        <path d="M250 478q16-8 32 0t32 0" strokeWidth="4" />
        <path d="M500 492q16-8 32 0t32 0" strokeWidth="4" />
        <path d="M100 520q18-9 36 0t36 0" strokeWidth="4.500" />
        <path d="M640 540q18-9 36 0t36 0" strokeWidth="4.500" />
      </g>

      {/* The island */}
      <ellipse cx="402" cy="452" rx="262" ry="34" fill="#1f6f9c" opacity="0.22" />
      <g className={styles.foam}>
        <ellipse cx="400" cy="441" rx="254" ry="34" fill="#fff" opacity="0.28" />
        <ellipse cx="400" cy="439" rx="244" ry="30" fill="#fff" opacity="0.75" />
      </g>
      <ellipse cx="400" cy="434" rx="234" ry="27" fill="#f6dfa6" />
      <path d="M178 432c40-64 116-150 214-154 92-4 176 82 232 154z" fill={`url(#${hill})`} />
      <path
        d="M178 432c40-22 96-30 150-26 50 4 86 14 140 12 60-2 110-6 156 14z"
        fill="#4fa457"
        opacity="0.32"
      />
      <path
        d="M230 392c34-44 82-84 136-100"
        fill="none"
        stroke="#c5f0a0"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M552 428c-36-18-44-44-84-56-18-6-30-22-48-34"
        fill="none"
        stroke="#f6e7bd"
        strokeWidth="13"
        strokeLinecap="round"
      />

      <Tree x={258} y={368} r={30} tone={0} />
      <Tree x={306} y={334} r={23} tone={1} />
      <Pine x={224} y={430} h={52} />

      {/* The schoolhouse */}
      <g>
        <rect x="312" y="280" width="62" height="40" rx="4" fill="#ffe9c7" />
        <rect x="350" y="280" width="24" height="40" fill="#f3d3a4" />
        <path d="M303 284 343 252l40 32z" fill="#ff8f7a" />
        <path d="M343 252l40 32h-18z" fill="#e2705c" />
        <rect x="324" y="294" width="13" height="13" rx="3" fill="#ffd35c" />
        <rect x="351" y="298" width="12" height="22" rx="5" fill="#8a5f3f" />
      </g>

      {/* The academy tower */}
      <g>
        <ellipse cx="408" cy="308" rx="34" ry="7" fill="#22304f" opacity="0.14" />
        <path d="M377 306 385 186h30l8 120z" fill="#fffaf0" />
        <g clipPath={`url(#${tower})`}>
          <rect x="370" y="212" width="60" height="22" fill="#ff8f7a" />
          <rect x="370" y="262" width="60" height="22" fill="#ff8f7a" />
          <rect x="404" y="180" width="30" height="130" fill="#22304f" opacity="0.1" />
        </g>
        <rect x="378" y="176" width="44" height="11" rx="4" fill="#c94f3b" />
        <rect
          x="386"
          y="152"
          width="28"
          height="25"
          rx="5"
          fill="#fff1b8"
          stroke="#c94f3b"
          strokeWidth="3.500"
        />
        <path d="M400 152v25" stroke="#c94f3b" strokeWidth="3" />
        <path d="M379 153 400 124l21 29z" fill="#c94f3b" />
        <path d="M400 124V99" stroke="#7a5236" strokeWidth="3" strokeLinecap="round" />
        <path className={styles.flag} d="M400 100q13-5 24 2-11 7-24 10z" fill="#ffd35c" />
        <circle
          cx="400"
          cy="248"
          r="7"
          fill="#8fd3f4"
          stroke="#22304f"
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <path d="M391 306v-14a9 9 0 0 1 18 0v14z" fill="#8a5f3f" />
      </g>

      <Tree x={470} y={356} r={21} tone={2} />
      <Tree x={512} y={330} r={27} tone={1} />
      <Tree x={560} y={376} r={31} tone={0} />
      <Pine x={596} y={428} h={46} />
      <ellipse cx="300" cy="404" rx="20" ry="11" fill="#4aa85a" />
      <ellipse cx="452" cy="408" rx="17" ry="9" fill="#4aa85a" />

      <g>
        {[
          [270, 420, '#ff8f7a'],
          [338, 408, '#fff'],
          [366, 426, '#ffd35c'],
          [420, 420, '#ff9fc2'],
          [488, 414, '#fff'],
          [516, 424, '#ffd35c'],
          [246, 408, '#fff'],
          [394, 396, '#ff8f7a'],
          [344, 372, '#ffd35c'],
          [434, 368, '#fff'],
        ].map(([x, y, colour]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.400" fill={colour as string} />
        ))}
      </g>

      <path d="M196 440c4-12 22-14 28-2 3 8-4 12-14 12s-17-3-14-10z" fill="#b9c3d6" />
      <path
        d="M204 437c3-5 9-6 13-3"
        fill="none"
        stroke="#dde3ef"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M588 444c2-9 16-11 21-2 3 7-3 10-11 10s-12-3-10-8z" fill="#aab6cc" />

      {/* Pier and boat */}
      <g>
        <path d="M548 430l92 16" stroke="#b9895b" strokeWidth="11" strokeLinecap="round" />
        <path
          d="M548 430l92 16"
          stroke="#d8ab7b"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="2 12"
        />
        <path d="M584 438v16M626 446v16" stroke="#8a5f3f" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g className={styles.boat}>
        <ellipse cx="672" cy="470" rx="34" ry="6" fill="#1f6f9c" opacity="0.25" />
        <path d="M670 398v62" stroke="#7a5236" strokeWidth="4" strokeLinecap="round" />
        <path d="M675 404c13 10 21 26 23 46h-23z" fill="#fff" />
        <path d="M665 410c-9 10-15 24-17 40h17z" fill="#4fcfc4" />
        <path d="M670 399l13 5-13 5z" fill="#ff8f7a" />
        <path d="M640 456h62c-3 9-9 14-18 14h-26c-9 0-15-5-18-14z" fill="#e8734f" />
        <path d="M645 461h52" stroke="#fff3dc" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}
