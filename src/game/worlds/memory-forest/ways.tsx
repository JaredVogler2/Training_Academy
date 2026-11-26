import type { Way } from '@/engine';
import styles from './memoryForest.module.css';

/**
 * A picture for each way of looking at things so as to remember them. They are drawn with plain shapes, in two
 * colours, so that what a button does is in its picture: two baskets with two things in each; one thing wearing
 * another; a path with a thing at each stop.
 */

const INK = '#2f8440';
const LEAF = '#5fbf64';
const BERRY = '#6b4fd0';
const SUN = '#f2a93b';

function Groups() {
  return (
    <>
      <rect
        x="-30"
        y="-20"
        width="27"
        height="40"
        rx="9"
        fill="#fff"
        stroke={INK}
        strokeWidth="3"
      />
      <rect
        x="3"
        y="-20"
        width="27"
        height="40"
        rx="9"
        fill="#fff"
        stroke={BERRY}
        strokeWidth="3"
      />
      <circle cx="-16.5" cy="-8" r="6.5" fill={LEAF} />
      <circle cx="-16.5" cy="9" r="6.5" fill={LEAF} />
      <rect x="10.5" y="-14" width="12" height="12" rx="3" fill={BERRY} />
      <rect x="10.5" y="3" width="12" height="12" rx="3" fill={BERRY} />
    </>
  );
}

function Story() {
  return (
    <>
      <circle cx="-7" cy="3" r="18" fill={LEAF} stroke={INK} strokeWidth="3" />
      <circle cx="-13" cy="-1" r="2.6" fill="#22304f" />
      <circle cx="-2" cy="-1" r="2.6" fill="#22304f" />
      <path
        d="M-13 8q5.5 5 11 0"
        fill="none"
        stroke="#22304f"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* What it has: sitting on its head, where no such thing belongs. */}
      <rect
        x="-17"
        y="-27"
        width="20"
        height="13"
        rx="4"
        fill={BERRY}
        transform="rotate(-10 -7 -20)"
      />
      <path
        d="M22-16l2.6 6.2 6.4.6-4.9 4.2 1.5 6.3-5.6-3.4-5.6 3.4 1.5-6.3-4.9-4.2 6.4-.6z"
        fill={SUN}
      />
    </>
  );
}

function Places() {
  return (
    <>
      <path
        d="M-30 16C-18-2-10 22 0 4S18-4 30-18"
        fill="none"
        stroke={INK}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="1 8"
      />
      <circle cx="-27" cy="12" r="6.5" fill={LEAF} />
      <rect x="-13" y="2" width="12" height="12" rx="3" fill={BERRY} />
      <circle cx="9" cy="-2" r="6.5" fill={SUN} />
      <rect x="21" y="-24" width="12" height="12" rx="3" fill={LEAF} stroke={INK} strokeWidth="2" />
    </>
  );
}

const PICTURES: Record<Way, () => React.JSX.Element> = {
  groups: Groups,
  story: Story,
  places: Places,
};

export function WayPicture({ way }: { way: Way }) {
  const Picture = PICTURES[way];
  return (
    <svg className={styles.wayPicture} viewBox="-36 -32 72 64" aria-hidden="true" focusable="false">
      <Picture />
    </svg>
  );
}
