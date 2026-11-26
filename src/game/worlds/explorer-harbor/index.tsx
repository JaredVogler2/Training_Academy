import { Fragment, type ReactNode } from 'react';
import type { Challenge, Stimulus } from '@/engine';
import type { PictureProps, WorldModule } from '../modules';
import { MAP, islandsOf } from '@/content/explorer-harbor/maps';
import { Globe, Heard, LandShape } from './Globe';
import { GlobeBoard } from './GlobeBoard';
import { LandmarkPicture } from './landmarks';
import { MapBoard } from './MapBoard';
import { StoryPicture } from './pictures';
import { chooseScript, makeScript, panelLine } from './script';
import places from '@/content/explorer-harbor/places.json';
import storybook from '@/content/explorer-harbor/storybook.json';
import { voice } from './voice';
import styles from './explorerHarbor.module.css';

/**
 * Explorer Harbor: stories told in pictures, why things happen, first ideas about a map, and the globe: the seven
 * big lands and fifteen famous places.
 */

type Scene = Extract<Stimulus, { type: 'scene' }>;

const NAMES: Readonly<Record<string, string>> = storybook.pictures;
const nameOf = (id: string): string => NAMES[id] ?? id;

const listOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((each): each is string => typeof each === 'string') : [];

const numbersOf = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((each): each is number => typeof each === 'number') : [];

const LANDMARKS: Readonly<Record<string, { name: string }>> = places.landmarks;

/** "And then": a short arrow between two pictures of a story. */
function Then() {
  return (
    <svg className={styles.then} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 12h14M12 5l7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.600"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** An empty place where a picture belongs: a dashed frame (a ring, for a thing that did something), waiting. */
function Gap({ round }: { round: boolean }) {
  const edge = {
    fill: 'rgb(255 255 255 / 55%)',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeDasharray: '5 5',
    strokeLinecap: 'round',
  } as const;
  return (
    <svg className={styles.gap} viewBox="-34 -34 68 68" aria-hidden="true" focusable="false">
      {round ? (
        <circle r="26" {...edge} />
      ) : (
        <rect x="-30" y="-30" width="60" height="60" rx="9" {...edge} />
      )}
      <circle r="5" fill="currentColor" />
    </svg>
  );
}

/**
 * Three pictures in a row with one of them missing: a story without its ending, or a thing before and after with
 * what happened in between left out. The empty place is where the answer goes, and when the answer has been
 * found the place is filled with it.
 */
function Strip({ stimulus, solved }: { stimulus: Scene; solved: boolean }) {
  const parts = listOf(stimulus.of.parts);
  const gap = typeof stimulus.of.gap === 'number' ? stimulus.of.gap : -1;
  const change = stimulus.of.kind === 'change';
  return (
    <span className={styles.strip} data-kind={change ? 'change' : 'story'} data-scene="strip">
      {parts.map((id, index) => {
        const missing = index === gap && !solved;
        return (
          <Fragment key={id}>
            {index > 0 && <Then />}
            <span
              className={styles.panel}
              // In a change, the middle picture is the thing that did it: it stands in a ring, not a frame.
              data-cause={change && index === 1}
              data-gap={missing}
              data-filled={index === gap && solved}
            >
              {missing ? (
                <Gap round={change && index === 1} />
              ) : (
                <StoryPicture id={id} className={styles.picture} />
              )}
            </span>
          </Fragment>
        );
      })}
    </span>
  );
}

/** Where the small marks on the sea go: the same on every map, so that a map never looks busier than another. */
const RIPPLES = [
  [8, 9],
  [31, 6],
  [56, 11],
  [83, 7],
  [18, 30],
  [44, 33],
  [70, 28],
  [92, 36],
  [9, 52],
  [34, 57],
  [61, 53],
  [86, 56],
] as const;

/** The sea, and the islands in it. Land is green with a rim of sand; water is blue with small waves. */
function Sea({ stimulus }: { stimulus: Scene }) {
  const islands = islandsOf(stimulus.of.islands);
  return (
    <svg
      className={styles.sea}
      viewBox={`0 0 ${String(MAP.width)} ${String(MAP.height)}`}
      aria-hidden="true"
      focusable="false"
      data-scene="map"
    >
      <rect width={MAP.width} height={MAP.height} rx="5" fill="#eaf6fb" />
      <rect width={MAP.width} height={MAP.height} rx="5" fill="#63b9dd" data-water="true" />
      <g fill="none" stroke="#a5dcf1" strokeWidth="0.900" strokeLinecap="round" data-water="true">
        {RIPPLES.map(([x, y]) => (
          <path
            key={`${String(x)}-${String(y)}`}
            d={`M${String(x)} ${String(y)}c1.500-1.500 3-1.500 4.500 0`}
          />
        ))}
      </g>
      {islands.map((island) => (
        <g key={`${String(island.x)}-${String(island.y)}`} data-land="true">
          <ellipse
            cx={island.x}
            cy={island.y}
            rx={island.rx + 1.5}
            ry={island.ry + 1.5}
            fill="#a5dcf1"
          />
          <ellipse cx={island.x} cy={island.y} rx={island.rx} ry={island.ry} fill="#f6e2a8" />
          <ellipse
            cx={island.x}
            cy={island.y}
            rx={island.rx * 0.86}
            ry={island.ry * 0.82}
            fill="#8fd07a"
          />
          <g fill="#62b35f">
            <circle
              cx={island.x - island.rx * 0.5}
              cy={island.y - island.ry * 0.3}
              r={Math.min(2.4, island.ry * 0.18)}
            />
            <circle
              cx={island.x + island.rx * 0.45}
              cy={island.y + island.ry * 0.38}
              r={Math.min(2, island.ry * 0.16)}
            />
            <circle
              cx={island.x + island.rx * 0.2}
              cy={island.y - island.ry * 0.5}
              r={Math.min(1.7, island.ry * 0.14)}
            />
          </g>
        </g>
      ))}
    </svg>
  );
}

const INK = '#22304f';

/** What stands at a place on a map. The middle of the drawing is the place itself. */
const MARKS: Record<string, ReactNode> = {
  // A flag on a pole: the foot of the pole is the place. The same flag stands on land and on water.
  flag: (
    <>
      <ellipse cy="0.300" rx="2.600" ry="1.200" fill={INK} opacity="0.3" />
      <path
        d="M0 0V-9.500"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.400"
        strokeLinecap="round"
      />
      <path
        d="M0-9.500l8 2.800-8 2.800z"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="1.600"
        strokeLinejoin="round"
      />
      <path d="M0 0V-9.500" fill="none" stroke={INK} strokeWidth="1.100" strokeLinecap="round" />
      <path d="M0-9.500l8 2.800-8 2.800z" fill="#ef5350" />
    </>
  ),
  palm: (
    <>
      <Islet />
      <path
        d="M0 1C1-3 1-6 0-9"
        fill="none"
        stroke="#a86a2e"
        strokeWidth="1.500"
        strokeLinecap="round"
      />
      <path
        d="M0-9c-3-2-6-1-7 1M0-9c3-2 6-1 7 1M0-9c-2-3-5-4-7-3M0-9c2-3 5-4 7-3"
        fill="none"
        stroke="#2f8440"
        strokeWidth="1.700"
        strokeLinecap="round"
      />
    </>
  ),
  hut: (
    <>
      <Islet />
      <path d="M-4 1v-5h8v5z" fill="#e7b877" />
      <path d="M-6-4l6-5 6 5z" fill="#c94f3b" />
      <path d="M-1 1v-3h2.400v3z" fill="#a86a2e" />
    </>
  ),
  light: (
    <>
      <Islet />
      <path d="M-2.200 1l0.800-9h2.800l0.800 9z" fill="#ffffff" />
      <path d="M-1.900-2.500h3.800l-0.200-2.600h-3.400z" fill="#ef5350" />
      <rect x="-2.600" y="-10.200" width="5.200" height="2.400" rx="0.600" fill="#ffd35c" />
      <path d="M-3-10.200l3-2.600 3 2.600z" fill="#c94f3b" />
    </>
  ),
};

/** A very small island for a thing to stand on. */
function Islet() {
  return (
    <>
      <ellipse cy="2" rx="9.500" ry="5.200" fill="#a5dcf1" />
      <ellipse cy="2" rx="8.200" ry="4.200" fill="#f6e2a8" />
      <ellipse cy="1.500" rx="6.600" ry="3" fill="#8fd07a" />
    </>
  );
}

function Mark({ stimulus }: { stimulus: Scene }) {
  const mark = typeof stimulus.of.mark === 'string' ? stimulus.of.mark : '';
  return (
    <svg
      className={styles.mark}
      viewBox="-12 -12 24 24"
      aria-hidden="true"
      focusable="false"
      data-mark={mark}
    >
      {MARKS[mark] ?? null}
    </svg>
  );
}

function Picture({ stimulus, place = 'card', solved = false }: PictureProps) {
  switch (stimulus.type) {
    case 'picture':
      return <StoryPicture id={stimulus.id} className={styles.picture} />;
    case 'scene':
      if (stimulus.scene === 'strip') {
        // On a small card there is room for one picture: how it starts.
        if (place === 'card') {
          return (
            <StoryPicture id={listOf(stimulus.of.parts)[0] ?? ''} className={styles.picture} />
          );
        }
        return <Strip stimulus={stimulus} solved={solved} />;
      }
      if (stimulus.scene === 'map') return <Sea stimulus={stimulus} />;
      if (stimulus.scene === 'spot') return <Mark stimulus={stimulus} />;
      if (stimulus.scene === 'globe') {
        const { ask, landmark, view } = stimulus.of;
        // On a small card, what the question is about: a famous place, a name that is only heard, or the globe.
        if (place === 'card' && typeof landmark === 'string') {
          return <LandmarkPicture id={landmark} className={styles.picture} />;
        }
        if (place === 'card' && ask === 'name') return <Heard className={styles.picture} />;
        const [lon, lat] = numbersOf(view);
        return <Globe view={{ lon: lon ?? 0, lat: lat ?? 0 }} className={styles.picture} />;
      }
      // One of the seven big lands: its shape, alone.
      if (stimulus.scene === 'land') {
        return (
          <LandShape
            land={typeof stimulus.of.continent === 'string' ? stimulus.of.continent : ''}
            className={styles.picture}
          />
        );
      }
      return null;
    // Things other worlds draw.
    case 'quantity':
    case 'sound':
    case 'letter':
    case 'word':
    case 'sign':
      return null;
  }
}

export function describe(stimulus: Stimulus): string {
  switch (stimulus.type) {
    case 'picture':
      return nameOf(stimulus.id);
    case 'scene': {
      const { scene, of } = stimulus;
      if (scene === 'strip') {
        const [first = '', second = '', third = ''] = listOf(of.parts).map(nameOf);
        if (of.kind !== 'change') return `A story. First, ${first}. Then, ${second}. And then?`;
        return of.gap === 1
          ? `Before: ${first}. After: ${third}. What happened in between?`
          : `Here is ${first}. Along comes ${second}. What happens next?`;
      }
      if (scene === 'map') {
        const islands = islandsOf(of.islands).length;
        if (of.ask === 'near' || of.ask === 'far')
          return 'A map: a boat on the sea, and three islands.';
        return `A map: blue sea, and ${islands === 1 ? 'one green island' : `${String(islands)} green islands`}, with flags.`;
      }
      // The globe is described by what is on it and never by the name of the land that is asked for: the
      // question says that, aloud and in writing.
      if (scene === 'globe') {
        const globe =
          'A globe of the world, with nothing written on it. Three of its lands have a pin.';
        if (of.ask === 'place' && typeof of.landmark === 'string') {
          const name = LANDMARKS[of.landmark]?.name ?? 'a famous place';
          return `A picture of ${name}. The shape of one land. ${globe}`;
        }
        return of.ask === 'shape' ? `The shape of one land. ${globe}` : globe;
      }
      if (scene === 'land') return 'A land on the globe.';
      return '';
    }
    case 'quantity':
    case 'sound':
    case 'letter':
    case 'word':
    case 'sign':
      return '';
  }
}

/** The lines a story's pictures are told with, so that they are on hand before the telling starts. */
function linesFor(challenge: Challenge): string[] {
  if (challenge.kind === 'make') {
    return challenge.task.type === 'order'
      ? challenge.task.cards.map((card) => panelLine(card.id))
      : [];
  }
  const { stimulus } = challenge.prompt;
  if (stimulus.type !== 'scene' || stimulus.scene !== 'strip' || stimulus.of.kind === 'change')
    return [];
  return listOf(stimulus.of.parts).map(panelLine);
}

const explorerHarbor: WorldModule = {
  Picture,
  describe,
  chooseScript,
  makeScript,
  linesFor,
  boards: { 'scene:map': MapBoard, 'scene:globe': GlobeBoard },
  voice,
};
export default explorerHarbor;
