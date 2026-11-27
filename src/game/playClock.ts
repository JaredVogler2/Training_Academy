import { useEffect } from 'react';

/**
 * A clock for how long an answer took. It runs while an activity is in play and stands still while the activity
 * is paused or the page is out of sight, so that what is written down with an answer is the time spent on the
 * question and not the time a phone lay on a table. (It was once the plain time between the question and the
 * answer, pause and all, up to the ten minutes any answer may say.)
 *
 * Nothing is judged by this time: no rule about what a child has shown reads it. It is kept because it is true.
 */
export interface PlayClock {
  /** Milliseconds of play so far, counted from an arbitrary start. A pause neither adds to it nor takes from it. */
  now: () => number;
  pause: () => void;
  resume: () => void;
}

export function createPlayClock(read: () => number = () => performance.now()): PlayClock {
  let stoppedAt: number | null = null;
  let stoppedFor = 0;
  return {
    now: () => (stoppedAt ?? read()) - stoppedFor,
    pause() {
      stoppedAt ??= read();
    },
    resume() {
      if (stoppedAt === null) return;
      // Whatever the time read has done meanwhile, the clock goes on from exactly where it stood.
      stoppedFor += read() - stoppedAt;
      stoppedAt = null;
    },
  };
}

/** The clock stands still for as long as `stopped` is true, and when whatever uses it has gone. */
export function useClockStopped(clock: PlayClock, stopped: boolean): void {
  useEffect(() => {
    if (!stopped) return;
    clock.pause();
    return () => clock.resume();
  }, [clock, stopped]);
}
