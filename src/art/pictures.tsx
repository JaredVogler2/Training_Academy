import type { ReactNode } from 'react';

/**
 * The picture kit: one plain drawing for each thing the worlds talk about — a sun, a sock, a hen. Hand-written SVG
 * in the game's storybook manner: flat shapes, soft colours, a little ink for an eye or a seam, nothing to read.
 *
 * Every picture is drawn about the middle of a 64-unit square, so that any of them fits any card. A picture has one
 * name, the word a grown-up would say for it, and that word is what the voice says and what a screen reader reads.
 */

const INK = '#22304f';
const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

interface KitPicture {
  /** The word for it. */
  word: string;
  draw: ReactNode;
}

export const PICTURES = {
  sun: {
    word: 'sun',
    draw: (
      <>
        <path
          d="M0-29v7M0 22v7M-29 0h7M22 0h7M-20.500-20.500l5 5M15.500 15.500l5 5M-20.500 20.500l5-5M15.500-15.500l5-5"
          {...line}
          stroke="#f5a623"
          strokeWidth="4"
        />
        <circle r="15" fill="#ffd35c" />
        <path d="M-8-5a10 10 0 0 1 9-6" {...line} stroke="#fff1b8" strokeWidth="3" />
      </>
    ),
  },
  moon: {
    word: 'moon',
    draw: (
      <>
        <path d="M6-24a24 24 0 1 0 18 36A20 20 0 0 1 6-24z" fill="#ffe9a8" />
        <circle cx="-8" cy="6" r="3" fill="#f3d27c" />
        <circle cx="-2" cy="-8" r="2" fill="#f3d27c" />
      </>
    ),
  },
  mat: {
    word: 'mat',
    draw: (
      <>
        <path d="M-27 14l8-24h38l8 24z" fill="#c98a4b" />
        <path d="M-21 8l5-14h32l5 14z" fill="#e7b877" />
        <path d="M-14 3h28M-12-2h24" {...line} stroke="#c98a4b" strokeWidth="2.400" />
        <path
          d="M-25 16v4M-17 16v4M-9 16v4M-1 16v4M7 16v4M15 16v4M23 16v4"
          {...line}
          stroke="#a86a2e"
          strokeWidth="2.400"
        />
      </>
    ),
  },
  map: {
    word: 'map',
    draw: (
      <>
        <path d="M-26-16l17-6v38l-17 6z" fill="#fff1d6" />
        <path d="M-9-22l18 6v38l-18-6z" fill="#ffe2ad" />
        <path d="M9-16l17-6v38l-17 6z" fill="#fff1d6" />
        <path
          d="M-20 12c4-10 8 0 12-9s8-2 12-8 8-2 12-6"
          {...line}
          stroke="#c94f3b"
          strokeWidth="2.400"
          strokeDasharray="1 5"
        />
        <path d="M14-11l6 6M20-11l-6 6" {...line} stroke="#c94f3b" strokeWidth="3" />
      </>
    ),
  },
  man: {
    word: 'man',
    draw: (
      <>
        <path d="M-9 8v20M9 8v20" {...line} stroke="#2a6fb5" strokeWidth="8" />
        <path d="M-15-6l-8 16M15-6l8 16" {...line} stroke="#f2c9a0" strokeWidth="6" />
        <path d="M-13-10h26l4 20h-34z" fill="#62b4f3" />
        <circle cy="-19" r="9" fill="#f2c9a0" />
        <path d="M-9-21c1-8 17-8 18 0-5-3-13-3-18 0z" fill="#7a5236" />
        <circle cx="-3" cy="-18" r="1.400" fill={INK} />
        <circle cx="3" cy="-18" r="1.400" fill={INK} />
      </>
    ),
  },
  pan: {
    word: 'pan',
    draw: (
      <>
        <path d="M8 4l20 12" {...line} stroke="#7a5236" strokeWidth="6" />
        <circle cx="-7" cy="-4" r="19" fill="#4d5b7c" />
        <circle cx="-7" cy="-4" r="14" fill="#22304f" />
        <path d="M-15-9a10 10 0 0 1 8-6" {...line} stroke="#8792ac" strokeWidth="2.400" />
      </>
    ),
  },
  pin: {
    word: 'pin',
    draw: (
      <>
        <path d="M-22 24L6-6" {...line} stroke="#8792ac" strokeWidth="3" />
        <circle cx="12" cy="-12" r="11" fill="#ef5350" />
        <circle cx="8" cy="-16" r="3" fill="#ff9f9a" />
      </>
    ),
  },
  tap: {
    word: 'tap',
    draw: (
      <>
        <path d="M-26-6h22c9 0 14 5 14 13v5H0V8c0-3-2-5-5-5h-21z" fill="#8fa3c4" />
        <path d="M-12-6v-10" {...line} stroke="#6f84a8" strokeWidth="5" />
        <path d="M-22-18h20" {...line} stroke="#ef5350" strokeWidth="6" />
        <path d="M5 17c-3 5-4 7-4 9a4 4 0 0 0 8 0c0-2-1-4-4-9z" fill="#45b9c7" />
      </>
    ),
  },
  tin: {
    word: 'tin',
    draw: (
      <>
        <path d="M-15-17v34c0 6 30 6 30 0v-34z" fill="#b8c4d6" />
        <path d="M-15-7v18c0 6 30 6 30 0V-7c0 6-30 6-30 0z" fill="#ef7b5a" />
        <ellipse cy="-17" rx="15" ry="5" fill="#dbe3ee" />
        <circle cx="-4" cy="5" r="5" fill="#ffe27a" />
      </>
    ),
  },
  top: {
    word: 'top',
    draw: (
      <>
        <path d="M0-28v10" {...line} stroke="#7a5236" strokeWidth="5" />
        <path d="M-22-10c0-9 44-9 44 0L3 24c-1 3-5 3-6 0z" fill="#62b4f3" />
        <path d="M-22-10c0-9 44-9 44 0-4 6-40 6-44 0z" fill="#ef5350" />
        <path d="M-15 2c9 4 21 4 30 0" {...line} stroke="#ffd35c" strokeWidth="4" />
      </>
    ),
  },
  pot: {
    word: 'pot',
    draw: (
      <>
        <path d="M-27-2h7M20-2h7" {...line} stroke="#4d5b7c" strokeWidth="5" />
        <path d="M-20-8h40v20c0 7-5 10-11 10h-18c-6 0-11-3-11-10z" fill="#8792ac" />
        <path d="M-22-9h44" {...line} stroke="#4d5b7c" strokeWidth="5" />
        <path d="M-12-13c0-8 24-8 24 0z" fill="#b8c4d6" />
        <circle cy="-21" r="3.500" fill="#4d5b7c" />
      </>
    ),
  },
  mop: {
    word: 'mop',
    draw: (
      <>
        <path d="M14-28L-6 8" {...line} stroke="#c98a4b" strokeWidth="4.500" />
        <path d="M-17 4l22 10-3 6-22-10z" fill="#62b4f3" />
        <path
          d="M-20 12l-3 12M-15 14l-2 13M-10 16v12M-5 18l1 11M0 20l3 9M4 21l5 7"
          {...line}
          stroke="#f4efe4"
          strokeWidth="4"
        />
      </>
    ),
  },
  fan: {
    word: 'fan',
    draw: (
      <>
        <path d="M0 22L-27-6a38 38 0 0 1 54 0z" fill="#ff8f7a" />
        <path
          d="M0 22L-17-15M0 22L-6-20M0 22L6-20M0 22L17-15"
          {...line}
          stroke="#c94f3b"
          strokeWidth="2.400"
        />
        <path d="M-20-2a28 28 0 0 1 40 0" {...line} stroke="#ffe6df" strokeWidth="3" />
        <circle cy="22" r="4" fill="#7a5236" />
      </>
    ),
  },
  fin: {
    word: 'fin',
    draw: (
      <>
        <path d="M-12 10C-8-10 2-22 12-26c-3 12 0 26 8 36z" fill="#6f84a8" />
        <path d="M-28 12c5-5 9-5 14 0s9 5 14 0 9-5 14 0 9 5 14 0v12h-56z" fill="#45b9c7" />
        <path
          d="M-22 20c4-3 7-3 11 0M4 20c4-3 7-3 11 0"
          {...line}
          stroke="#a8e3df"
          strokeWidth="2.400"
        />
      </>
    ),
  },
  lip: {
    word: 'lip',
    draw: (
      <>
        <path
          d="M-26 0c8-12 16-14 20-10 3 2 9 2 12 0 4-4 12-2 20 10-8 12-18 16-26 16s-18-4-26-16z"
          fill="#ef5350"
        />
        <path d="M-26 0c10 4 42 4 52 0" {...line} stroke="#a8322f" strokeWidth="2.400" />
        <path d="M-12-5c3-2 6-2 8-1" {...line} stroke="#ff9f9a" strokeWidth="2.400" />
      </>
    ),
  },
  cat: {
    word: 'cat',
    draw: (
      <>
        <path d="M14 22c10 0 12-10 8-16" {...line} stroke="#f0a55c" strokeWidth="5" />
        <path d="M-16 26c-2-16 4-26 14-26s16 10 14 26z" fill="#f0a55c" />
        <path d="M-17-24l4 12h-9zM13-24l5 12H9z" fill="#f0a55c" />
        <circle cx="-2" cy="-10" r="14" fill="#f6b877" />
        <circle cx="-7" cy="-12" r="2" fill={INK} />
        <circle cx="3" cy="-12" r="2" fill={INK} />
        <path d="M-4-6l2 2 2-2M-12-5h-7M8-5h7" {...line} stroke={INK} strokeWidth="1.800" />
      </>
    ),
  },
  cap: {
    word: 'cap',
    draw: (
      <>
        <path d="M-22 6c0-22 36-22 36 0z" fill="#62b4f3" />
        <path d="M-22 6h36c8 0 14 3 16 8H-8c-8 0-14-3-14-8z" fill="#2a6fb5" />
        <circle cx="-4" cy="-11" r="2.600" fill="#2a6fb5" />
        <path d="M-4-11v17" {...line} stroke="#2a6fb5" strokeWidth="2" />
      </>
    ),
  },
  cup: {
    word: 'cup',
    draw: (
      <>
        <path d="M12-6c12-2 14 14 0 14" {...line} stroke="#ef7b5a" strokeWidth="5" />
        <path d="M-18-12h32v14c0 10-7 16-16 16s-16-6-16-16z" fill="#ef7b5a" />
        <ellipse cx="-2" cy="-12" rx="16" ry="4" fill="#8a4a2e" />
        <path d="M-22 22h40" {...line} stroke="#ffd9c9" strokeWidth="5" />
      </>
    ),
  },
  can: {
    word: 'can',
    draw: (
      <>
        <path d="M-8-4L-27-16" {...line} stroke="#3aa6a0" strokeWidth="5" />
        <path d="M-30-20l8 3-5 7z" fill="#3aa6a0" />
        <path d="M14-6c14-4 14 18 0 16" {...line} stroke="#3aa6a0" strokeWidth="5" />
        <path d="M-12-12h28v32h-28z" fill="#4fcfc4" />
        <path d="M-12-12h28" {...line} stroke="#3aa6a0" strokeWidth="5" />
        <circle cx="2" cy="6" r="6" fill="#dbf7f3" />
      </>
    ),
  },
  hat: {
    word: 'hat',
    draw: (
      <>
        <ellipse cy="12" rx="28" ry="8" fill="#dba85c" />
        <path d="M-16 12c0-30 32-30 32 0z" fill="#f0c98a" />
        <path d="M-16 8c8 4 24 4 32 0v5c-8 4-24 4-32 0z" fill="#ef5350" />
      </>
    ),
  },
  hen: {
    word: 'hen',
    draw: (
      <>
        <path d="M-4 18v9M6 18v9M-8 27h8M2 27h8" {...line} stroke="#f5a623" strokeWidth="3" />
        <path d="M-24-2c0 16 10 22 22 22s22-8 22-20c0-4-2-8-2-8-10 8-26 10-42 6z" fill="#fff6e6" />
        <path d="M-24-2c-2-8 2-14 6-18 0 8 4 14 12 18z" fill="#f4e3c2" />
        <circle cx="16" cy="-12" r="9" fill="#fff6e6" />
        <path d="M11-21c0-5 4-5 4-1 0-5 5-5 5 0 2-3 5 0 2 3z" fill="#ef5350" />
        <path d="M24-12l7 3-7 3z" fill="#f5a623" />
        <circle cx="18" cy="-13" r="1.600" fill={INK} />
        <path d="M-8 4c4 6 12 6 16 0" {...line} stroke="#e6d2ac" strokeWidth="2.400" />
      </>
    ),
  },
  nut: {
    word: 'nut',
    draw: (
      <>
        <path d="M-18-2c0 18 8 26 18 28 10-2 18-10 18-28z" fill="#b07a45" />
        <path d="M-20-4c2-16 38-16 40 0-6 6-34 6-40 0z" fill="#e7c08a" />
        <path d="M0-16v-8" {...line} stroke="#7a5236" strokeWidth="3" />
        <path d="M-8 6c1 6 4 11 7 13" {...line} stroke="#cf9a62" strokeWidth="2.600" />
      </>
    ),
  },
  net: {
    word: 'net',
    draw: (
      <>
        <path d="M6 6l20 22" {...line} stroke="#c98a4b" strokeWidth="4.500" />
        <path d="M-24-10c2 22 10 30 18 30s14-10 16-30z" fill="#dff0ff" />
        <path
          d="M-18-4l22 16M-10-10l18 14M-22 8l16-18M-12 18l20-26M-2 20l12-22"
          {...line}
          stroke="#9cc4ea"
          strokeWidth="1.600"
        />
        <ellipse cx="-7" cy="-10" rx="17" ry="6" fill="none" stroke="#c98a4b" strokeWidth="4" />
      </>
    ),
  },
  pen: {
    word: 'pen',
    draw: (
      <>
        <path d="M-26 22c6-6 10 4 16-2" {...line} stroke={INK} strokeWidth="2.400" />
        <path d="M-14 10L14-18l8 8L-6 18z" fill="#62b4f3" />
        <path d="M14-18l5-5c3-3 11 5 8 8l-5 5z" fill="#2a6fb5" />
        <path d="M-14 10l-5 13 13-5z" fill="#f2c9a0" />
        <path d="M-19 23l2-6 4 4z" fill={INK} />
      </>
    ),
  },
  rat: {
    word: 'rat',
    draw: (
      <>
        <path d="M-14 12c-12 2-16-10-8-16" {...line} stroke="#e5a0a8" strokeWidth="3" />
        <path d="M-18 16c-2-14 8-22 20-22 9 0 16 6 26 18 1 2 0 4-2 4z" fill="#a39382" />
        <circle cx="4" cy="-8" r="7" fill="#8a7b6b" />
        <circle cx="4" cy="-8" r="3.600" fill="#e5a0a8" />
        <circle cx="27" cy="13" r="2.400" fill="#e5a0a8" />
        <circle cx="16" cy="4" r="2" fill={INK} />
        <path d="M20 12l8-4M20 14l8 2" {...line} stroke="#6b5d50" strokeWidth="1.400" />
      </>
    ),
  },
  hut: {
    word: 'hut',
    draw: (
      <>
        <path d="M-18-2h36v26h-36z" fill="#e7c08a" />
        <path d="M-28 0L0-26l28 26z" fill="#c98a4b" />
        <path d="M-16-6L0-20l16 14" {...line} stroke="#a86a2e" strokeWidth="2.400" />
        <path d="M-6 24V8c0-8 12-8 12 0v16z" fill="#7a5236" />
      </>
    ),
  },
  cot: {
    word: 'cot',
    draw: (
      <>
        <path d="M-22 22v6M22 22v6" {...line} stroke="#c98a4b" strokeWidth="4" />
        <path d="M-24 10h48v10h-48z" fill="#b9c8ff" />
        <path
          d="M-24-18v38M24-18v38M-24-14h48M-14-14v24M-5-14v24M5-14v24M14-14v24"
          {...line}
          stroke="#c98a4b"
          strokeWidth="3.600"
        />
        <path d="M-24 20h48" {...line} stroke="#c98a4b" strokeWidth="5" />
      </>
    ),
  },
  ram: {
    word: 'ram',
    draw: (
      <>
        <path d="M-12 14v12M10 14v12" {...line} stroke="#4d5b7c" strokeWidth="4" />
        <path
          d="M-22 2c-4-8 2-16 10-14 2-8 14-8 16-2 8-4 16 2 14 10 6 4 4 14-4 14 0 6-10 8-14 4-4 4-14 4-16-2-8 2-12-6-6-10z"
          fill="#f4efe4"
        />
        <path d="M12-10c6-2 14 2 14 10 0 6-4 10-8 10s-8-4-6-10z" fill="#4d5b7c" />
        <path d="M10-8c-8-6-16 0-14 8 2 6 10 6 10 0" {...line} stroke="#c98a4b" strokeWidth="4" />
        <circle cx="20" cy="-2" r="1.800" fill="#fff" />
      </>
    ),
  },
  sock: {
    word: 'sock',
    draw: (
      <>
        <path d="M-8-26h18v28c0 4 2 6 6 9l6 5c6 5 2 12-6 12H2c-8 0-10-6-10-12z" fill="#ff8f7a" />
        <path d="M-8-26h18v9H-8z" fill="#ffe6df" />
        <path d="M-8-6h18M-8 3h18" {...line} stroke="#ffe6df" strokeWidth="3" />
        <path d="M12 22c4-4 10-4 14 0" {...line} stroke="#c94f3b" strokeWidth="2.400" />
      </>
    ),
  },
  soap: {
    word: 'soap',
    draw: (
      <>
        <path
          d="M-22 0h38c6 0 10 4 10 9v4c0 5-4 9-10 9h-38c-5 0-8-4-8-9V9c0-5 3-9 8-9z"
          fill="#f7b6d2"
        />
        <path d="M-16 6h26" {...line} stroke="#fde0ee" strokeWidth="3" />
        <circle cx="-10" cy="-12" r="7" fill="#dff0ff" stroke="#9cc4ea" strokeWidth="1.600" />
        <circle cx="6" cy="-20" r="5" fill="#dff0ff" stroke="#9cc4ea" strokeWidth="1.600" />
        <circle cx="14" cy="-8" r="3.500" fill="#dff0ff" stroke="#9cc4ea" strokeWidth="1.600" />
      </>
    ),
  },
  seed: {
    word: 'seed',
    draw: (
      <>
        <path d="M-28 14c10-8 46-8 56 0v12h-56z" fill="#8a5f3f" />
        <path d="M-12 12c6-4 18-4 24 0" {...line} stroke="#6b4a2e" strokeWidth="3" />
        <path d="M0-26c12 6 16 22 0 34-16-12-12-28 0-34z" fill="#3b3140" />
        <path
          d="M-5-14c-2 6-1 12 2 16M5-14c2 6 1 12-2 16"
          {...line}
          stroke="#f4efe4"
          strokeWidth="2.600"
        />
      </>
    ),
  },
  mug: {
    word: 'mug',
    draw: (
      <>
        <path d="M10-8c16-2 16 22 0 20" {...line} stroke="#6fcf74" strokeWidth="6" />
        <path d="M-20-18h32v34c0 4-3 6-6 6h-20c-3 0-6-2-6-6z" fill="#6fcf74" />
        <ellipse cx="-4" cy="-18" rx="16" ry="4.500" fill="#2f8440" />
        <path d="M-14-6v18" {...line} stroke="#b9ecbb" strokeWidth="3" />
      </>
    ),
  },
  fish: {
    word: 'fish',
    draw: (
      <>
        <path d="M14 0l14-12v24z" fill="#f5a623" />
        <path d="M-26 0c8-16 30-18 42 0-12 18-34 16-42 0z" fill="#ffb347" />
        <path d="M-6-11c4 6 4 16 0 22" {...line} stroke="#f5a623" strokeWidth="2.400" />
        <path d="M-2-13c2-6 8-8 12-6-2 4-6 7-12 6z" fill="#f5a623" />
        <circle cx="-16" cy="-2" r="2.400" fill={INK} />
      </>
    ),
  },
  fox: {
    word: 'fox',
    draw: (
      <>
        <path d="M-22-22l10 14h-16zM22-22l6 14H12z" fill="#ef7b3a" />
        <path d="M-22-10c4-10 40-10 44 0-2 20-12 32-22 34-10-2-20-14-22-34z" fill="#ef7b3a" />
        <path
          d="M-14 4c4 10 8 16 14 20 6-4 10-10 14-20-6 6-10 6-14 2-4 4-8 4-14-2z"
          fill="#fff6e6"
        />
        <circle cx="-9" cy="-4" r="2.200" fill={INK} />
        <circle cx="9" cy="-4" r="2.200" fill={INK} />
        <path d="M-3 20h6l-3 4z" fill={INK} />
      </>
    ),
  },
  nest: {
    word: 'nest',
    draw: (
      <>
        <ellipse cx="-9" cy="-4" rx="7" ry="9" fill="#dff0ff" />
        <ellipse cx="3" cy="-7" rx="7" ry="9" fill="#fff6e6" />
        <ellipse cx="13" cy="-3" rx="6" ry="8" fill="#dff0ff" />
        <path d="M-27 0c0 16 12 22 27 22s27-6 27-22c-12 6-42 6-54 0z" fill="#b07a45" />
        <path
          d="M-22 6c8 6 14 0 22 6s14-2 20 0M-16 14c8 4 20 4 30 0"
          {...line}
          stroke="#7a5236"
          strokeWidth="2.400"
        />
      </>
    ),
  },
  nose: {
    word: 'nose',
    draw: (
      <>
        <path
          d="M-4-26c-2 16-14 26-14 36 0 8 8 12 16 10 4 4 12 4 16 0 6 2 12-2 12-8 0-10-12-20-12-38z"
          fill="#f2c9a0"
        />
        <ellipse cx="-7" cy="14" rx="4" ry="2.600" fill="#c98a6b" />
        <ellipse cx="13" cy="14" rx="4" ry="2.600" fill="#c98a6b" />
        <path d="M2-18c0 10-4 16-6 20" {...line} stroke="#e0ad84" strokeWidth="2.600" />
      </>
    ),
  },
  leaf: {
    word: 'leaf',
    draw: (
      <>
        <path d="M-22 20C-26-8-6-28 24-24 28 6 8 26-22 20z" fill="#5fbf64" />
        <path d="M-21 19C-8 6 8-10 22-22" {...line} stroke="#2f8440" strokeWidth="3" />
        <path
          d="M-6 4l-9-7M6-8l-9-7M2 0l10 3"
          {...line}
          stroke="#2f8440"
          strokeWidth="2.400"
          opacity="0.7"
        />
      </>
    ),
  },
  lamp: {
    word: 'lamp',
    draw: (
      <>
        <path d="M0 0v20" {...line} stroke="#8792ac" strokeWidth="4" />
        <path d="M-14 26c0-8 28-8 28 0z" fill="#8792ac" />
        <path d="M-10-26h20l10 26h-40z" fill="#ffd35c" />
        <path d="M-6-20h6l4 14" {...line} stroke="#fff1b8" strokeWidth="3" />
      </>
    ),
  },
  log: {
    word: 'log',
    draw: (
      <>
        <path d="M-16-12h36c8 0 8 26 0 26h-36z" fill="#a8774f" />
        <ellipse cx="-16" cy="1" rx="8" ry="13" fill="#e7c08a" />
        <ellipse cx="-16" cy="1" rx="4" ry="7" fill="none" stroke="#c98a4b" strokeWidth="2" />
        <path d="M-2-6h16M2 6h14" {...line} stroke="#7a5236" strokeWidth="2.400" />
        <path d="M8-12c2-8 10-10 14-6-2 6-8 8-14 6z" fill="#5fbf64" />
      </>
    ),
  },
  rain: {
    word: 'rain',
    draw: (
      <>
        <path
          d="M-14 10l-4 12M-2 10l-4 12M10 10l-4 12M22 10l-4 12"
          {...line}
          stroke="#45b9c7"
          strokeWidth="4"
        />
        <path
          d="M-18 4c-10 0-12-14-2-16 0-12 18-14 22-4 8-6 20 0 16 10 8 2 6 10-2 10z"
          fill="#b8c4d6"
        />
        <path d="M-10-10c2-6 8-8 12-6" {...line} stroke="#dbe3ee" strokeWidth="3" />
      </>
    ),
  },
  ring: {
    word: 'ring',
    draw: (
      <>
        <circle cy="8" r="16" fill="none" stroke="#f5a623" strokeWidth="6" />
        <path d="M-9-12l9-12 9 12-9 8z" fill="#62b4f3" />
        <path d="M-9-12h18M0-24v20" {...line} stroke="#dff0ff" strokeWidth="1.800" />
      </>
    ),
  },
  drum: {
    word: 'drum',
    draw: (
      <>
        <path d="M-22-8v20c0 8 44 8 44 0V-8z" fill="#ef5350" />
        <path d="M-22-4l11 20 11-20 11 20 11-20" {...line} stroke="#ffd35c" strokeWidth="2.400" />
        <ellipse cy="-8" rx="22" ry="8" fill="#fff6e6" stroke="#c94f3b" strokeWidth="3" />
        <path d="M-26-26l16 14M26-26L10-12" {...line} stroke="#c98a4b" strokeWidth="3.600" />
      </>
    ),
  },
  bell: {
    word: 'bell',
    draw: (
      <>
        <path d="M0-28v6" {...line} stroke="#c88a00" strokeWidth="4" />
        <path d="M-22 14c8-6 6-18 8-26 2-10 26-10 28 0 2 8 0 20 8 26z" fill="#ffcf4a" />
        <path d="M-24 14h48" {...line} stroke="#c88a00" strokeWidth="5" />
        <circle cy="22" r="5" fill="#c88a00" />
        <path d="M-8-12c1-5 4-8 8-9" {...line} stroke="#fff1b8" strokeWidth="3" />
      </>
    ),
  },
  shaker: {
    word: 'shaker',
    draw: (
      <>
        <path d="M6 6l16 20" {...line} stroke="#c98a4b" strokeWidth="6" />
        <ellipse cx="-6" cy="-8" rx="18" ry="20" transform="rotate(-38 -6 -8)" fill="#6fcf74" />
        <path d="M-20-14c6 6 20 12 30 12" {...line} stroke="#ffd35c" strokeWidth="4" />
        <path d="M-14-22c6 6 16 10 26 10" {...line} stroke="#ef5350" strokeWidth="4" />
      </>
    ),
  },
  whistle: {
    word: 'whistle',
    draw: (
      <>
        <path d="M-26-14h34v12h-34z" fill="#62b4f3" />
        <circle cx="10" cy="4" r="16" fill="#62b4f3" />
        <circle cx="10" cy="4" r="6" fill="#2a6fb5" />
        <path d="M-12-14v-0.100h10v6h-10z" fill="#2a6fb5" />
        <circle cx="22" cy="-16" r="4" fill="none" stroke="#8792ac" strokeWidth="2.400" />
      </>
    ),
  },
  bird: {
    word: 'bird',
    draw: (
      <>
        <path d="M-16 6l-12-8 2 16z" fill="#2a6fb5" />
        <path d="M-4 22v6M6 22v6" {...line} stroke="#c98a4b" strokeWidth="3" />
        <path
          d="M-20 4c0-14 10-24 22-24 12 0 20 8 20 18 0 14-10 26-24 26-10 0-18-8-18-20z"
          fill="#62b4f3"
        />
        <path d="M-6 12c2-10 10-16 20-14-2 10-10 18-20 14z" fill="#2a6fb5" />
        <path d="M20-10l10 4-10 5z" fill="#ffb347" />
        <circle cx="12" cy="-9" r="2.600" fill={INK} />
      </>
    ),
  },
  clock: {
    word: 'clock',
    draw: (
      <>
        <path d="M-14 22l-4 6M14 22l4 6" {...line} stroke="#c94f3b" strokeWidth="4" />
        <circle r="24" fill="#ef5350" />
        <circle r="18" fill="#fff6e6" />
        <path d="M0-12V0l8 6" {...line} stroke={INK} strokeWidth="3" />
        <path d="M0-16v2M0 14v2M-16 0h2M14 0h2" {...line} stroke="#8792ac" strokeWidth="2.400" />
      </>
    ),
  },
  ant: {
    word: 'ant',
    draw: (
      <>
        <path
          d="M-8 4l-10 16M0 6v18M8 4l10 16M-8-2l-12-12M8-2l12-12M14-14l6-10M20-14l8-8"
          {...line}
          stroke={INK}
          strokeWidth="2.600"
        />
        <ellipse cx="-16" cy="6" rx="11" ry="9" fill="#7a3b2e" />
        <ellipse cx="0" cy="2" rx="8" ry="7" fill="#8f4a3a" />
        <circle cx="14" cy="-6" r="9" fill="#7a3b2e" />
        <circle cx="17" cy="-8" r="2" fill="#fff" />
      </>
    ),
  },
  apple: {
    word: 'apple',
    draw: (
      <>
        <path
          d="M0-12c-13-13-28-3-26 15 3 17 14 27 26 20 12 7 23-3 26-20 2-18-13-28-26-15z"
          fill="#ef5350"
        />
        <path d="M-16-2c1-6 6-10 11-11" {...line} stroke="#ff9f9a" strokeWidth="4" />
        <path d="M0-12c0-7 3-11 7-14" {...line} stroke="#7a5236" strokeWidth="4" />
        <path d="M6-20c4-7 13-8 18-4-4 7-13 8-18 4z" fill="#5fbf64" />
      </>
    ),
  },
  axe: {
    word: 'axe',
    draw: (
      <>
        <path d="M-20 26L10-18" {...line} stroke="#c98a4b" strokeWidth="6" />
        <path d="M0-26c12-4 24 2 28 14-8-2-14 0-20 6z" fill="#b8c4d6" />
        <path d="M22-16c2 2 4 5 6 8" {...line} stroke="#f4f7fb" strokeWidth="3" />
      </>
    ),
  },
  igloo: {
    word: 'igloo',
    draw: (
      <>
        <path d="M-28 22c0-34 56-34 56 0z" fill="#cfe6fb" />
        <path
          d="M-26 12h52M-20 0h40M-10-10h20M-12 12v10M12 12v10M-4 0v12M-16 0v0M16 0v12M4-10V0M-16 2v10"
          {...line}
          stroke="#9cc4ea"
          strokeWidth="2.200"
        />
        <path d="M-8 22V12c0-10 16-10 16 0v10z" fill="#4d5b7c" />
      </>
    ),
  },
  ink: {
    word: 'ink',
    draw: (
      <>
        <path
          d="M-18-2c0-6 4-8 8-8h20c4 0 8 2 8 8v20c0 5-4 8-8 8h-20c-4 0-8-3-8-8z"
          fill="#3b4f8f"
        />
        <path d="M-8-22h16v12H-8z" fill="#8792ac" />
        <path d="M-12 4h24v10h-24z" fill="#f4efe4" />
        <path d="M-6 9h12" {...line} stroke="#3b4f8f" strokeWidth="2.600" />
        <path d="M22 16c-2 4-3 6-3 8a3 3 0 0 0 6 0c0-2-1-4-3-8z" fill="#3b4f8f" />
      </>
    ),
  },
  octopus: {
    word: 'octopus',
    draw: (
      <>
        <path
          d="M-18 4c-6 6-10 10-8 18M-9 8c-3 8-4 12-2 18M0 10v16M9 8c3 8 4 12 2 18M18 4c6 6 10 10 8 18"
          {...line}
          stroke="#c05aa8"
          strokeWidth="5"
        />
        <path d="M-22-4c0-28 44-28 44 0 0 10-10 16-22 16s-22-6-22-16z" fill="#e07cc7" />
        <circle cx="-8" cy="-6" r="4" fill="#fff" />
        <circle cx="8" cy="-6" r="4" fill="#fff" />
        <circle cx="-7" cy="-5" r="2" fill={INK} />
        <circle cx="9" cy="-5" r="2" fill={INK} />
        <path d="M-5 3c3 3 7 3 10 0" {...line} stroke="#8f3a7c" strokeWidth="2.400" />
      </>
    ),
  },
  olive: {
    word: 'olive',
    draw: (
      <>
        <path d="M-2-28c2 8 2 14 0 20" {...line} stroke="#7a5236" strokeWidth="3" />
        <path d="M0-22c8-8 20-6 24 0-8 8-18 6-24 0z" fill="#5fbf64" />
        <ellipse cx="-2" cy="8" rx="15" ry="19" fill="#7c9a3a" />
        <circle cx="-2" cy="-6" r="4" fill="#c94f3b" />
        <path d="M-10 2c0 8 2 14 6 18" {...line} stroke="#a9c268" strokeWidth="3" />
      </>
    ),
  },
  umbrella: {
    word: 'umbrella',
    draw: (
      <>
        <path d="M0-20V18c0 8 10 8 10 0" {...line} stroke="#7a5236" strokeWidth="4" />
        <path
          d="M-28-2c2-30 54-30 56 0-5-5-9-5-14 0-5-5-9-5-14 0-5-5-9-5-14 0-5-5-9-5-14 0z"
          fill="#ef5350"
        />
        <path
          d="M-14-2C-12-14-6-22 0-24M14-2C12-14 6-22 0-24"
          {...line}
          stroke="#c94f3b"
          strokeWidth="2.400"
        />
        <path d="M0-28v4" {...line} stroke="#7a5236" strokeWidth="4" />
      </>
    ),
  },
  egg: {
    word: 'egg',
    draw: (
      <>
        <path
          d="M0-26c12 0 20 18 20 30 0 13-9 22-20 22s-20-9-20-22c0-12 8-30 20-30z"
          fill="#f7e3bd"
        />
        <path d="M-9-10c2-6 5-9 9-10" {...line} stroke="#fff6e6" strokeWidth="4" />
        <path d="M-20 4c0 13 9 22 20 22s20-9 20-22c-4 12-12 16-20 16s-16-4-20-16z" fill="#e8cc98" />
      </>
    ),
  },
  elephant: {
    word: 'elephant',
    draw: (
      <>
        <path d="M-14 12v14M2 12v14M14 12v12" {...line} stroke="#7d8aa5" strokeWidth="8" />
        <path d="M-24-8c0-12 12-18 26-18s24 8 24 20-8 22-24 22-26-10-26-24z" fill="#98a5bf" />
        <path d="M-8-12c-10-4-18 2-16 12s12 12 16 4z" fill="#b6c1d6" />
        <path d="M22-6c8 4 8 18 4 26-2 4-8 2-6-2 2-6 2-12-2-16z" fill="#98a5bf" />
        <circle cx="12" cy="-10" r="2.200" fill={INK} />
        <path d="M16 2l8 2" {...line} stroke="#fff6e6" strokeWidth="3.600" />
      </>
    ),
  },
  ship: {
    word: 'ship',
    draw: (
      <>
        <path d="M0-27v38" {...line} stroke="#7a5236" strokeWidth="3.600" />
        <path d="M4-24l20 30H4z" fill="#fff6e6" />
        <path d="M-4-17L-20 6h16z" fill="#ffe2ad" />
        <path d="M0-27l9 3-9 4z" fill="#ef5350" />
        <path d="M-27 10h54l-9 14h-36z" fill="#c94f3b" />
        <path d="M-22 15h44" {...line} stroke="#ef7b5a" strokeWidth="2.400" />
        <path
          d="M-29 27c5-4 9 3 14.500 0s9 3 14.500 0 9 3 14.500 0 9 3 14.500 0"
          {...line}
          stroke="#62b4f3"
          strokeWidth="3"
        />
      </>
    ),
  },
  shop: {
    word: 'shop',
    draw: (
      <>
        <path d="M-22-6h44v32h-44z" fill="#fff1d6" />
        <path d="M-16-27h32v10h-32z" fill="#2a6fb5" />
        <path d="M-11-22h22" {...line} stroke="#bfe3ff" strokeWidth="2.400" />
        <path d="M-27-17h54l-3 13h-48z" fill="#ef5350" />
        <path d="M-16-17h10l-1 13h-9zM5-17h10l1 13H6z" fill="#fff6e6" />
        <path d="M5 8h13v18H5z" fill="#7a5236" />
        <circle cx="15" cy="18" r="1.400" fill="#f5c04a" />
        <path d="M-18 4h17v13h-17z" fill="#bfe3ff" />
        <path d="M-18 4h17v13h-17zM-9.500 4v13" {...line} stroke="#c98a4b" strokeWidth="2.400" />
      </>
    ),
  },
  chin: {
    word: 'chin',
    draw: (
      <>
        <path d="M-22-6c0-15 10-22 22-22s22 7 22 22c0 18-10 29-22 29S-22 12-22-6z" fill="#f2c9a0" />
        <path
          d="M-22-8c0-14 10-21 22-21s22 7 22 21c-6-10-16-13-22-13s-16 3-22 13z"
          fill="#7a5236"
        />
        <path d="M-10 21c5 4 15 4 20 0-3-9-17-9-20 0z" fill="#ef7b5a" />
        <circle cx="-9" cy="-6" r="2" fill={INK} />
        <circle cx="9" cy="-6" r="2" fill={INK} />
        <path d="M-6 6c4 3 8 3 12 0" {...line} stroke={INK} strokeWidth="2" />
        <path d="M20 31L9 23" {...line} stroke="#e0b088" strokeWidth="7" />
      </>
    ),
  },
  chip: {
    word: 'chip',
    draw: (
      <>
        <path
          d="M-27 2c2-14 16-22 30-20 14 2 24 12 22 24-2 11-14 18-28 16C-17 20-29 14-27 2z"
          fill="#f5c04a"
        />
        <path
          d="M-18-3c6-8 16-10 24-7M-20 6c8-8 22-10 36-5M-14 14c8-6 20-7 30-3"
          {...line}
          stroke="#dba032"
          strokeWidth="2.400"
        />
        <circle cx="-8" cy="-9" r="1.400" fill="#fff6e6" />
        <circle cx="10" cy="2" r="1.400" fill="#fff6e6" />
        <circle cx="-4" cy="10" r="1.400" fill="#fff6e6" />
        <path d="M20-20l5 3-4 4zM-26-18l4-1 0 5z" fill="#f5c04a" />
      </>
    ),
  },
  moth: {
    word: 'moth',
    draw: (
      <>
        <path
          d="M-2-14c-4-8-9-11-13-12M2-14c4-8 9-11 13-12"
          {...line}
          stroke="#6b5d50"
          strokeWidth="2"
        />
        <path d="M-3-6C-12-22-30-20-29-6c1 10 14 12 26 6z" fill="#c9b79c" />
        <path d="M3-6C12-22 30-20 29-6 28 4 15 6 3 0z" fill="#c9b79c" />
        <path d="M-3 2c-10 0-20 6-17 16 3 8 15 4 17-6z" fill="#b3a084" />
        <path d="M3 2c10 0 20 6 17 16-3 8-15 4-17-6z" fill="#b3a084" />
        <circle cx="-17" cy="-8" r="4" fill="#8a7b6b" />
        <circle cx="17" cy="-8" r="4" fill="#8a7b6b" />
        <circle cx="-11" cy="12" r="2.400" fill="#8a7b6b" />
        <circle cx="11" cy="12" r="2.400" fill="#8a7b6b" />
        <ellipse cy="2" rx="4.500" ry="15" fill="#6b5d50" />
      </>
    ),
  },
  path: {
    word: 'path',
    draw: (
      <>
        <path d="M-30 28V-4c14-8 46-8 60 0v32z" fill="#bfe6a8" />
        <path
          d="M-14 28C-12 16 12 14 8 4 6-2-6-2-3-9h7c-2 5 12 5 13 13 1 10-14 12-9 24z"
          fill="#e7c08a"
        />
        <path d="M-21-6v-9M22 2v-9" {...line} stroke="#7a5236" strokeWidth="3" />
        <circle cx="-21" cy="-18" r="7" fill="#5fbf64" />
        <circle cx="22" cy="-10" r="7" fill="#5fbf64" />
        <path d="M-24 14l2-5 2 5M17 20l2-5 2 5" {...line} stroke="#5fbf64" strokeWidth="2" />
      </>
    ),
  },
  cheese: {
    word: 'cheese',
    draw: (
      <>
        <path d="M-27 6L18-20c7 6 10 14 10 22z" fill="#ffe08a" />
        <path d="M-27 6l55-4v20l-55 4z" fill="#ffd35c" />
        <path d="M-27 6l55-4" {...line} stroke="#f5a623" strokeWidth="2.400" />
        <circle cx="-12" cy="15" r="4" fill="#f5a623" />
        <circle cx="6" cy="10" r="3" fill="#f5a623" />
        <circle cx="18" cy="16" r="2.400" fill="#f5a623" />
        <circle cx="8" cy="-8" r="2.600" fill="#f5c04a" />
      </>
    ),
  },
  thumb: {
    word: 'thumb',
    draw: (
      <>
        <path d="M-27 0h11v26h-11z" fill="#62b4f3" />
        <path d="M-9 4V-18c0-9 13-9 13 0V4z" fill="#f6d5b3" />
        <path d="M-16 0h24c6 0 10 4 10 9v9c0 5-4 8-10 8h-24z" fill="#f2c9a0" />
        <path d="M0 9h17M0 17h17" {...line} stroke="#d9a877" strokeWidth="2.400" />
        <path d="M-6-19c1-3 6-3 7 0" {...line} stroke="#fff1e0" strokeWidth="2" />
      </>
    ),
  },
  banana: {
    word: 'banana',
    draw: (
      <>
        <path
          d="M-25-13c-1 24 22 38 46 24 4-2 4-7 0-8-18 4-32-4-38-17-2-4-8-3-8 1z"
          fill="#ffd35c"
        />
        <path d="M-18-6c5 12 18 20 34 16" {...line} stroke="#fff1b8" strokeWidth="3" />
        <path d="M-26-12l-1-8 7 3z" fill="#7a5236" />
        <circle cx="22" cy="7" r="2.400" fill="#7a5236" />
      </>
    ),
  },
  lemon: {
    word: 'lemon',
    draw: (
      <>
        <g transform="rotate(-18)">
          <path
            d="M-28 0c4-3 6-4 8-8 8-12 30-12 38 0 2 4 5 6 10 8-5 2-8 4-10 8-8 12-30 12-38 0-2-4-4-5-8-8z"
            fill="#ffe14a"
          />
          <path d="M-13-8c6-5 14-6 21-3" {...line} stroke="#fff6b0" strokeWidth="3" />
          <circle cx="-6" cy="5" r="1" fill="#f5c04a" />
          <circle cx="4" cy="8" r="1" fill="#f5c04a" />
          <circle cx="10" cy="2" r="1" fill="#f5c04a" />
        </g>
        <path d="M-2-17c0-8 8-12 16-10-1 8-8 12-16 10z" fill="#5fbf64" />
      </>
    ),
  },
  rocket: {
    word: 'rocket',
    draw: (
      <>
        <path d="M-6 12c0 8 3 12 6 18 3-6 6-10 6-18z" fill="#f5a623" />
        <path d="M-3 12c0 4 1 7 3 10 2-3 3-6 3-10z" fill="#ffd35c" />
        <path d="M-12 2l-10 14h10zM12 2l10 14H12z" fill="#ef5350" />
        <path d="M0-29c11 9 13 24 12 42h-24c-1-18 1-33 12-42z" fill="#e9eef7" />
        <path d="M0-29c5 4 8 9 10 15h-20c2-6 5-11 10-15z" fill="#ef5350" />
        <circle cy="-3" r="5.500" fill="#2a6fb5" />
        <circle cy="-3" r="3.500" fill="#bfe3ff" />
      </>
    ),
  },
} satisfies Record<string, KitPicture>;

export type PictureId = keyof typeof PICTURES;

export function isPictureId(id: string): id is PictureId {
  return Object.hasOwn(PICTURES, id);
}

/** The word for a picture; the id itself for one the kit does not have. */
export function wordFor(id: string): string {
  return isPictureId(id) ? PICTURES[id].word : id;
}

/** One picture from the kit, as large as the box it is given. Nothing at all, for one the kit does not have. */
export function KitPicture({ id, className }: { id: string; className?: string }) {
  if (!isPictureId(id)) return null;
  return (
    <svg
      className={className}
      viewBox="-34 -34 68 68"
      aria-hidden="true"
      focusable="false"
      data-picture={id}
    >
      <ellipse cy="29" rx="20" ry="3.500" fill={INK} opacity="0.08" />
      {PICTURES[id].draw}
    </svg>
  );
}
