import { WORLD_IDS, type WorldId } from '@/engine/schema';

/**
 * The route table, as data. Pure functions only: the browser plumbing lives in navigation.tsx.
 *
 * Paths never contain a dot, so a static host can tell a page from a file (see vercel.json).
 */
export type Route =
  | { name: 'home' }
  | { name: 'world'; world: WorldId }
  | { name: 'play'; world: WorldId; lessonId: string }
  /** A room to play in freely, where a world has one: nothing is asked there and nothing is kept. */
  | { name: 'room'; world: WorldId }
  /** Glim shows how the game is played: what to tap, and what happens when it is. */
  | { name: 'how-to' }
  | { name: 'grown-ups' }
  /** The art studio: one island, or one drawing, on its own. Not linked from the game. */
  | { name: 'studio'; view: string }
  | { name: 'not-found'; path: string };

const LESSON_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The worlds that have a room to play in freely. */
export const ROOMS: readonly WorldId[] = ['music-lab'];

function isWorldId(value: string): value is WorldId {
  return (WORLD_IDS as readonly string[]).includes(value);
}

function segmentsOf(pathname: string): string[] | null {
  try {
    return pathname
      .split('/')
      .filter((segment) => segment !== '')
      .map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
}

export function parsePath(pathname: string): Route {
  const notFound: Route = { name: 'not-found', path: pathname };
  const segments = segmentsOf(pathname);
  if (!segments) return notFound;

  const [first, second, third, fourth, ...rest] = segments;
  if (first === undefined) return { name: 'home' };
  if (first === 'grown-ups' && second === undefined) return { name: 'grown-ups' };
  if (first === 'how-to-play' && second === undefined) return { name: 'how-to' };
  if (
    first === 'studio' &&
    second !== undefined &&
    third === undefined &&
    LESSON_SLUG.test(second)
  ) {
    return { name: 'studio', view: second };
  }
  if (first === 'world' && second !== undefined && isWorldId(second)) {
    if (third === undefined) return { name: 'world', world: second };
    if (third === 'room' && fourth === undefined && ROOMS.includes(second)) {
      return { name: 'room', world: second };
    }
    if (third === 'play' && fourth !== undefined && rest.length === 0 && LESSON_SLUG.test(fourth)) {
      return { name: 'play', world: second, lessonId: fourth };
    }
  }
  return notFound;
}

export function toPath(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/';
    case 'world':
      return `/world/${route.world}`;
    case 'play':
      return `/world/${route.world}/play/${route.lessonId}`;
    case 'room':
      return `/world/${route.world}/room`;
    case 'how-to':
      return '/how-to-play';
    case 'grown-ups':
      return '/grown-ups';
    case 'studio':
      return `/studio/${route.view}`;
    case 'not-found':
      return route.path;
  }
}

export function sameRoute(a: Route, b: Route): boolean {
  return toPath(a) === toPath(b);
}
