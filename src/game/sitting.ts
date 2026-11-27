import { useEffect, useSyncExternalStore } from 'react';
import { activeProfile, useProfiles } from './profiles';
import { now } from './services';

/**
 * How long has been played in this sitting, so that the game can stop offering more when a grown-up has said
 * how long a sitting should be.
 *
 * Only time in an activity counts: an activity on the screen, not paused, with the page in sight. A sitting is a
 * stretch of that with no long gap in it: half an hour away from every activity begins a new one, and so does a
 * new visit, because the count is kept for the visit and no longer. Nothing is kept but a number of
 * milliseconds and when it was last added to; it leaves the device nowhere, and no record of a child is made
 * of it.
 *
 * When the time is up nothing is closed and nothing is taken away. The game stops pointing at the next thing:
 * Glim rests on the map, a world's page has no big Play button, and the end of an activity says that it is a
 * good moment to stop. Every activity can still be played from its picture. That is all "stopping" means here:
 * no more suggestions, and no pressure in either direction.
 */

const KEY = 'training-academy.sitting';
/** How long away from every activity ends a sitting. */
export const SITTING_GAP_MS = 30 * 60 * 1000;
/** How often the time in an activity is added up while one is being played. */
export const TICK_MS = 1000;

interface Kept {
  playedMs: number;
  lastAt: number;
}

const NOTHING: Kept = { playedMs: 0, lastAt: 0 };
const listeners = new Set<() => void>();

function read(at: number): Kept {
  try {
    const kept: unknown = JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null');
    if (typeof kept !== 'object' || kept === null) return NOTHING;
    const { playedMs, lastAt } = kept as Partial<Kept>;
    if (typeof playedMs !== 'number' || typeof lastAt !== 'number') return NOTHING;
    if (!Number.isFinite(playedMs) || !Number.isFinite(lastAt) || playedMs < 0) return NOTHING;
    // A long gap, or a clock that has gone backwards by more than a tick or two: another sitting.
    const away = at - lastAt;
    if (away > SITTING_GAP_MS || away < -60_000) return NOTHING;
    return { playedMs, lastAt };
  } catch {
    // Storage is blocked, or what is there is not ours: nothing has been played, as far as can be told.
    return NOTHING;
  }
}

/** How long has been played in this sitting, in milliseconds, as of `at`. */
export function playedInSitting(at: number): number {
  return read(at).playedMs;
}

/** Add time spent in an activity to this sitting. */
export function notePlay(milliseconds: number, at: number): void {
  if (!(milliseconds > 0)) return;
  const kept = read(at);
  try {
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify({ playedMs: kept.playedMs + milliseconds, lastAt: at }),
    );
  } catch {
    // Nowhere to keep it: the sitting is simply never over.
  }
  for (const listener of listeners) listener();
}

/** Whether a sitting of the length a grown-up chose has been played out. Never, where they chose none. */
export function isTimeToRest(minutes: number | null | undefined, at: number): boolean {
  return typeof minutes === 'number' && minutes > 0 && playedInSitting(at) >= minutes * 60_000;
}

/** How often a page that is drawn by the sitting looks again, for a sitting that has ended by itself. */
export const LOOK_AGAIN_MS = 60_000;

let looking: number | null = null;
function lookAgain(): void {
  for (const listener of listeners) listener();
}

/**
 * A sitting also ends by itself, with half an hour away from every activity, and nothing is written then to say
 * so. So while any page is drawn by whether it is time to rest, it is asked again when the page comes back into
 * sight and once a minute while it is there: Glim does not stay asleep on a page left open over lunch.
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener('visibilitychange', lookAgain);
    window.addEventListener('pageshow', lookAgain);
    looking = window.setInterval(lookAgain, LOOK_AGAIN_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    document.removeEventListener('visibilitychange', lookAgain);
    window.removeEventListener('pageshow', lookAgain);
    if (looking !== null) window.clearInterval(looking);
    looking = null;
  };
}

/** While `playing` is true, the time is added to the sitting, a second at a time. */
export function useSittingClock(playing: boolean): void {
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      // A page that is out of sight is not being played.
      if (document.visibilityState === 'visible') notePlay(TICK_MS, now());
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [playing]);
}

/**
 * Whether it is time to rest, for the player who is playing: they have a sitting length, set by a grown-up, and
 * this sitting has reached it. It is asked again whenever time is added.
 */
export function useTimeToRest(): { rest: boolean; minutes: number | null } {
  const minutes = activeProfile(useProfiles())?.settings.sessionMinutes ?? null;
  // The one rule there is for it (`isTimeToRest`), asked as of now: what is drawn changes only when its answer
  // does. (This used to work it out for itself, in whole minutes, beside the rule and not by it: a change to
  // the rule would have changed nothing a child sees, and no test of the game could have told.)
  const rest = useSyncExternalStore(subscribe, () => isTimeToRest(minutes, now()));
  return { rest, minutes };
}
