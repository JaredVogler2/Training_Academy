import { useId, type ReactNode } from 'react';
import type { AvatarId, WorldId } from '@/engine';

/**
 * Hand-authored vector art for the shell: the brand mark, one emblem per world and the player pictures. Everything is
 * original to this project (no third-party artwork) and drawn in code so it stays crisp at any size and costs no
 * network request. Phase 02 replaces or refines these within the same components.
 *
 * All of it is decorative: the element that shows it carries the accessible name.
 */

const INK = '#22304f';

interface ArtProps {
  size?: number | string;
  className?: string;
}

function Art({
  size,
  className,
  viewBox,
  children,
}: ArtProps & { viewBox: string; children: ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------------------------------------------------

/** The academy on its island: a small lighthouse-school under a morning sun. */
export function BrandMark(props: ArtProps) {
  const sky = useId();
  const clip = useId();
  return (
    <Art viewBox="0 0 64 64" {...props}>
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6dbdea" />
          <stop offset="0.75" stopColor="#fdecc8" />
        </linearGradient>
        <clipPath id={clip}>
          <rect width="64" height="64" rx="17" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="64" height="64" fill={`url(#${sky})`} />
        <circle cx="48" cy="17" r="7.500" fill="#ffd35c" />
        <path d="M-2 50c8-3 14 3 22 0s14-3 22 0 14 3 24 0v16H-2z" fill="#45b9c7" />
        <path d="M9 49c6-13 15-19 23-19s17 6 23 19z" fill="#6fcf74" />
        <path
          d="M14 49c5-8 11-12 18-12"
          fill="none"
          stroke="#8fe08e"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M27 40 28.800 21h6.400L37 40z" fill="#fffaf0" />
        <path d="M27.900 31h8.200l.4 4.200h-9z" fill="#ff8f7a" />
        <path d="M26 21.500 32 12l6 9.500z" fill="#c94f3b" />
        <circle cx="32" cy="26" r="1.900" fill="#ffd35c" />
        <path d="M-2 55c8-3 14 3 22 0s14-3 22 0 14 3 24 0v11H-2z" fill="#2b82b0" opacity="0.55" />
      </g>
    </Art>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// World emblems
// ---------------------------------------------------------------------------------------------------------------------

function ReadingCove() {
  return (
    <>
      <ellipse cx="60" cy="103" rx="38" ry="6" fill={INK} opacity="0.1" />
      {/* Sound first: waves rise from the open book. */}
      <path
        d="M44 38a16 16 0 0 1 32 0"
        fill="none"
        stroke="#ff8f7a"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M32 34a28 28 0 0 1 56 0"
        fill="none"
        stroke="#ffc2b5"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="60" cy="40" r="5.500" fill="#c94f3b" />
      <path
        d="M60 58c-12-9-28-9-42-4v40c14-5 30-5 42 4z"
        fill="#fff8ec"
        stroke="#c94f3b"
        strokeWidth="4.500"
        strokeLinejoin="round"
      />
      <path
        d="M60 58c12-9 28-9 42-4v40c-14-5-30-5-42 4z"
        fill="#fff8ec"
        stroke="#c94f3b"
        strokeWidth="4.500"
        strokeLinejoin="round"
      />
      <path d="M60 58v40" stroke="#c94f3b" strokeWidth="4.500" strokeLinecap="round" />
      <g fill="none" stroke="#ffb3a3" strokeWidth="3.600" strokeLinecap="round">
        <path d="M27 66c8-2.500 16-2 24 1.500" />
        <path d="M27 76c8-2.500 16-2 24 1.500" />
        <path d="M69 67.500c8-3.500 16-4 24-1.500" />
        <path d="M69 77.500c8-3.500 16-4 24-1.500" />
      </g>
    </>
  );
}

function NumberGarden() {
  return (
    <>
      <ellipse cx="60" cy="104" rx="38" ry="6" fill={INK} opacity="0.1" />
      <path d="M14 92C16 52 52 28 108 30c0 44-34 74-82 70z" fill="#6fcf74" />
      <path
        d="M22 96c22-18 50-40 80-60"
        fill="none"
        stroke="#2f8440"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M48 76 38 58M70 58 62 42"
        fill="none"
        stroke="#2f8440"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
      />
      <g transform="rotate(-18 64 66)">
        <path
          d="M54 44c-4-6-9-8-13-7M74 44c4-6 9-8 13-7"
          fill="none"
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="64" cy="48" r="12" fill={INK} />
        <circle cx="64" cy="70" r="24" fill="#f0564a" />
        <path d="M64 47v47" stroke={INK} strokeWidth="3.500" />
        <circle cx="53" cy="62" r="5.200" fill={INK} />
        <circle cx="75" cy="62" r="5.200" fill={INK} />
        <circle cx="74" cy="79" r="5.200" fill={INK} />
        <circle cx="59.500" cy="45" r="2.300" fill="#fff" />
        <circle cx="68.500" cy="45" r="2.300" fill="#fff" />
        <path
          d="M46 62c2-8 8-13 15-15"
          fill="none"
          stroke="#ff9a8f"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </>
  );
}

function RobotRidge() {
  return (
    <>
      <ellipse cx="60" cy="104" rx="36" ry="6" fill={INK} opacity="0.1" />
      <path d="M60 34V20" stroke="#2a6fb5" strokeWidth="5" strokeLinecap="round" />
      <circle cx="60" cy="17" r="7.500" fill="#ffc45a" />
      <rect x="11" y="54" width="14" height="22" rx="7" fill="#2a6fb5" />
      <rect x="95" y="54" width="14" height="22" rx="7" fill="#2a6fb5" />
      <rect x="21" y="32" width="78" height="66" rx="20" fill="#62b4f3" />
      <path
        d="M29 48c2-6 7-9 13-9"
        fill="none"
        stroke="#a9d8ff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="31" y="46" width="58" height="42" rx="14" fill="#eaf5ff" />
      <circle cx="47" cy="62" r="9" fill="#fff" stroke="#2a6fb5" strokeWidth="3" />
      <circle cx="73" cy="62" r="9" fill="#fff" stroke="#2a6fb5" strokeWidth="3" />
      <circle cx="48.500" cy="63" r="4.200" fill={INK} />
      <circle cx="74.500" cy="63" r="4.200" fill={INK} />
      <path
        d="M49 77c7 5 15 5 22 0"
        fill="none"
        stroke={INK}
        strokeWidth="3.600"
        strokeLinecap="round"
      />
    </>
  );
}

function MemoryForest() {
  return (
    <>
      <ellipse cx="60" cy="106" rx="36" ry="5" fill={INK} opacity="0.1" />
      <path d="M12 98h96" stroke="#9a6a45" strokeWidth="8" strokeLinecap="round" />
      <path d="M92 98c2-10 9-14 16-13-1 8-7 13-16 13z" fill="#6fcf74" />
      <path d="M33 38 37 14l17 15zM87 38 83 14 66 29z" fill="#6b4fd0" />
      <ellipse cx="60" cy="62" rx="33" ry="36" fill="#a993f8" />
      <path
        d="M27 62c-3 12 0 23 8 30M93 62c3 12 0 23-8 30"
        fill="none"
        stroke="#6b4fd0"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <ellipse cx="60" cy="76" rx="18" ry="19" fill="#ece6ff" />
      <g fill="none" stroke="#c9bcff" strokeWidth="3" strokeLinecap="round">
        <path d="M52 72q4 4 8 0t8 0" />
        <path d="M52 81q4 4 8 0t8 0" />
      </g>
      <circle cx="46" cy="50" r="13" fill="#fff" />
      <circle cx="74" cy="50" r="13" fill="#fff" />
      <circle cx="47.500" cy="51" r="6" fill={INK} />
      <circle cx="72.500" cy="51" r="6" fill={INK} />
      <circle cx="49.500" cy="48.500" r="2" fill="#fff" />
      <circle cx="74.500" cy="48.500" r="2" fill="#fff" />
      <path
        d="m60 56-6 9h12z"
        fill="#ffc45a"
        stroke="#d98f12"
        strokeWidth="1.500"
        strokeLinejoin="round"
      />
      <path
        d="M50 97v-6M56 97v-6M64 97v-6M70 97v-6"
        stroke="#d98f12"
        strokeWidth="3.500"
        strokeLinecap="round"
      />
    </>
  );
}

function InventorIsland() {
  const teeth = Array.from({ length: 8 }, (_, index) => index * 45);
  return (
    <>
      <ellipse cx="60" cy="106" rx="36" ry="5" fill={INK} opacity="0.1" />
      <g transform="translate(36 80)">
        {teeth.map((angle) => (
          <rect
            key={angle}
            x="-5"
            y="-25"
            width="10"
            height="12"
            rx="3"
            fill="#a86a00"
            transform={`rotate(${angle})`}
          />
        ))}
        <circle r="18" fill="#a86a00" />
        <circle r="7.500" fill="#fff1d1" />
      </g>
      <g fill="none" stroke="#ffc45a" strokeWidth="5.500" strokeLinecap="round">
        <path d="M70 8v9" />
        <path d="M42 18l6 7" />
        <path d="M98 18l-6 7" />
        <path d="M30 44h9" />
        <path d="M101 44h9" />
      </g>
      <path
        d="M70 22a25 25 0 0 0-15 45c3 2.400 4.500 5 4.500 8.500V78h21v-2.500c0-3.500 1.500-6.100 4.500-8.500A25 25 0 0 0 70 22z"
        fill="#ffe08a"
        stroke="#a86a00"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M57 39c2-5 6-8 11-9"
        fill="none"
        stroke="#fff6d6"
        strokeWidth="4.500"
        strokeLinecap="round"
      />
      <path
        d="M62 62c-1-9 3-13 8-13s9 4 8 13"
        fill="none"
        stroke="#a86a00"
        strokeWidth="3.200"
        strokeLinecap="round"
      />
      <rect x="59" y="78" width="22" height="15" rx="5" fill="#7d8cab" />
      <path d="M59 84h22M63 97h14" stroke="#4d5b7c" strokeWidth="3.500" strokeLinecap="round" />
    </>
  );
}

function ExplorerHarbor() {
  return (
    <>
      <circle cx="94" cy="24" r="10" fill="#ffd35c" />
      <path d="M58 12v70" stroke="#7a5236" strokeWidth="5" strokeLinecap="round" />
      <path d="M58 13l17 7-17 6z" fill="#ff8f7a" />
      <path
        d="M64 28c16 12 26 28 28 46H64z"
        fill="#fff"
        stroke="#bfe9e4"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M52 34C40 46 32 60 30 74h22z"
        fill="#4fcfc4"
        stroke="#17807d"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M18 80h84c-3 10-10 16-20 16H38c-10 0-17-6-20-16z" fill="#e8734f" />
      <path d="M22 86h76" stroke="#fff3dc" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      <g fill="none" strokeWidth="5.500" strokeLinecap="round">
        <path d="M8 102q8-7 16 0t16 0 16 0 16 0 16 0 16 0" stroke="#17807d" />
        <path d="M14 113q8-7 16 0t16 0 16 0 16 0 16 0 14 0" stroke="#4fcfc4" />
      </g>
    </>
  );
}

/** Chime bars, each shorter than the last, with a beater lying across them and a note in the air. */
function MusicLab() {
  const bars: readonly (readonly [number, number, string, string])[] = [
    [18, 62, '#f0564a', '#b83a30'],
    [35, 54, '#ff9f45', '#c46a17'],
    [52, 46, '#ffd35c', '#c88a00'],
    [69, 38, '#6fcf74', '#2f8440'],
    [86, 30, '#62b4f3', '#2a6fb5'],
  ];
  return (
    <>
      <ellipse cx="60" cy="108" rx="40" ry="5" fill={INK} opacity="0.1" />
      <path d="M12 98 104 82" stroke="#9a6a45" strokeWidth="7" strokeLinecap="round" />
      <path d="M12 52 104 62" stroke="#9a6a45" strokeWidth="7" strokeLinecap="round" />
      {bars.map(([x, tall, fill, rim]) => (
        <g key={x}>
          <rect
            x={x}
            y={78 - tall / 2}
            width="14"
            height={tall}
            rx="6"
            fill={fill}
            stroke={rim}
            strokeWidth="2.500"
          />
          <circle cx={x + 7} cy={84 - tall / 2} r="1.800" fill={rim} />
          <circle cx={x + 7} cy={72 + tall / 2} r="1.800" fill={rim} />
        </g>
      ))}
      <path d="M30 34 88 70" stroke="#7a5236" strokeWidth="4.500" strokeLinecap="round" />
      <circle cx="27" cy="32" r="8.500" fill="#a993f8" stroke="#6b4fd0" strokeWidth="2.500" />
      <g fill={INK}>
        <ellipse cx="88" cy="30" rx="6.500" ry="5" transform="rotate(-20 88 30)" />
        <path d="M92.500 28V8l14 5v6l-11-4v14z" />
      </g>
    </>
  );
}

const EMBLEMS: Record<WorldId, () => ReactNode> = {
  'reading-cove': ReadingCove,
  'number-garden': NumberGarden,
  'robot-ridge': RobotRidge,
  'memory-forest': MemoryForest,
  'inventor-island': InventorIsland,
  'explorer-harbor': ExplorerHarbor,
  'music-lab': MusicLab,
};

export function WorldEmblem({ world, ...props }: ArtProps & { world: WorldId }) {
  const Emblem = EMBLEMS[world];
  return (
    <Art viewBox="0 0 120 120" {...props}>
      <Emblem />
    </Art>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Player pictures
// ---------------------------------------------------------------------------------------------------------------------

function Face({ y = 0 }: { y?: number }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <circle cx="20.500" cy="38.500" r="3.400" fill="#ff8f7a" opacity="0.45" />
      <circle cx="43.500" cy="38.500" r="3.400" fill="#ff8f7a" opacity="0.45" />
      <circle cx="25" cy="32.500" r="2.900" fill={INK} />
      <circle cx="39" cy="32.500" r="2.900" fill={INK} />
      <path
        d="M26 39c3.500 4 8.500 4 12 0"
        fill="none"
        stroke={INK}
        strokeWidth="2.600"
        strokeLinecap="round"
      />
    </g>
  );
}

const AVATARS: Record<AvatarId, () => ReactNode> = {
  sun: () => (
    <>
      {Array.from({ length: 8 }, (_, index) => (
        <rect
          key={index}
          x="29.500"
          y="2"
          width="5"
          height="11"
          rx="2.500"
          fill="#ffb74a"
          transform={`rotate(${index * 45} 32 33)`}
        />
      ))}
      <circle cx="32" cy="33" r="18.500" fill="#ffd35c" />
      <Face />
    </>
  ),
  moon: () => (
    <>
      <circle cx="32" cy="33" r="23" fill="#cfd8ff" />
      <circle cx="46" cy="22" r="4.500" fill="#b3c0f4" />
      <circle cx="17" cy="23" r="3" fill="#b3c0f4" />
      <circle cx="44" cy="49" r="3.200" fill="#b3c0f4" />
      <Face />
    </>
  ),
  leaf: () => (
    <>
      <path d="M32 5c20 10 26 34 0 55C6 39 12 15 32 5z" fill="#6fcf74" />
      <path d="M32 11v44" stroke="#4aae57" strokeWidth="2.600" strokeLinecap="round" />
      <path d="M32 24l-9-7M32 24l9-7" stroke="#4aae57" strokeWidth="2.200" strokeLinecap="round" />
      <Face y={3} />
    </>
  ),
  shell: () => (
    <>
      <path d="M32 59C12 53 5 33 11 19 17 6 47 6 53 19c6 14-1 34-21 40z" fill="#ffb7a3" />
      <g fill="none" stroke="#f0907a" strokeWidth="2.200" strokeLinecap="round">
        <path d="M32 57 20 13" />
        <path d="M32 57 44 13" />
        <path d="M32 57V10" />
      </g>
      <Face y={4} />
    </>
  ),
  star: () => (
    <>
      <path
        d="m32 6 7.300 15.400 16.900 2.300-12.300 11.800 3 16.800L32 44.200 17.100 52.300l3-16.800L7.800 23.700l16.900-2.300z"
        fill="#ffc45a"
        stroke="#ffc45a"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <Face y={1} />
    </>
  ),
  drop: () => (
    <>
      <path d="M32 5c11 14 20 25 20 35a20 20 0 0 1-40 0c0-10 9-21 20-35z" fill="#62b4f3" />
      <path
        d="M21 31c1-5 4-9 7-13"
        fill="none"
        stroke="#b7deff"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Face y={7} />
    </>
  ),
};

export function AvatarPicture({ avatar, ...props }: ArtProps & { avatar: AvatarId }) {
  const Picture = AVATARS[avatar];
  return (
    <Art viewBox="0 0 64 64" {...props}>
      <Picture />
    </Art>
  );
}
