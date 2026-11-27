// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createPlayClock, useClockStopped, type PlayClock } from '@/game/playClock';

/**
 * How long an answer took is the time the activity was in play between the question and the answer: not the time
 * it stood paused, or lay out of sight.
 */

afterEach(cleanup);

/** A clock with a hand to move: the time that really passes, for the play clock to count or not. */
function wall(start = 5000) {
  let at = start;
  return {
    read: () => at,
    pass(milliseconds: number) {
      at += milliseconds;
    },
  };
}

describe('the clock an answer is timed by', () => {
  it('runs with the time that passes while nothing has stopped it', () => {
    const time = wall();
    const clock = createPlayClock(time.read);
    const shown = clock.now();
    time.pass(1200);
    expect(clock.now() - shown).toBe(1200);
    time.pass(300);
    expect(clock.now() - shown).toBe(1500);
  });

  it('stands still while it is paused, and goes on from where it stood', () => {
    const time = wall();
    const clock = createPlayClock(time.read);
    const shown = clock.now();
    time.pass(2000);
    clock.pause();
    time.pass(600_000);
    expect(clock.now() - shown).toBe(2000);
    clock.resume();
    expect(clock.now() - shown).toBe(2000);
    time.pass(1500);
    expect(clock.now() - shown).toBe(3500);
  });

  it('adds up nothing of any pause, however many there are', () => {
    const time = wall();
    const clock = createPlayClock(time.read);
    const shown = clock.now();
    for (const away of [10_000, 250, 90_000]) {
      time.pass(1000);
      clock.pause();
      time.pass(away);
      clock.resume();
    }
    expect(clock.now() - shown).toBe(3000);
  });

  it('takes a pause asked for twice as one pause, from when it was first asked for', () => {
    const time = wall();
    const clock = createPlayClock(time.read);
    const shown = clock.now();
    clock.pause();
    time.pass(4000);
    clock.pause();
    time.pass(4000);
    clock.resume();
    time.pass(500);
    expect(clock.now() - shown).toBe(500);
  });

  it('is not put out by being told to go on when it was not paused', () => {
    const time = wall();
    const clock = createPlayClock(time.read);
    const shown = clock.now();
    clock.resume();
    time.pass(700);
    clock.resume();
    expect(clock.now() - shown).toBe(700);
  });

  it('goes on from exactly where it stood, whatever the time it reads did while it was paused', () => {
    const time = wall();
    const clock = createPlayClock(time.read);
    time.pass(1000);
    const stoodAt = clock.now();
    clock.pause();
    time.pass(-800);
    expect(clock.now()).toBe(stoodAt);
    clock.resume();
    expect(clock.now()).toBe(stoodAt);
    time.pass(250);
    expect(clock.now()).toBe(stoodAt + 250);
  });

  it('reads the page’s own clock when it is given no other', () => {
    const clock = createPlayClock();
    const first = clock.now();
    expect(Number.isFinite(first)).toBe(true);
    expect(clock.now()).toBeGreaterThanOrEqual(first);
  });
});

describe('an activity that is paused', () => {
  function Activity({ clock, paused }: { clock: PlayClock; paused: boolean }) {
    useClockStopped(clock, paused);
    return null;
  }

  it('stops the clock for as long as it is paused, and for no longer', () => {
    const time = wall();
    const clock = createPlayClock(time.read);
    const shown = clock.now();
    const { rerender } = render(<Activity clock={clock} paused={false} />);
    time.pass(1000);
    expect(clock.now() - shown).toBe(1000);
    rerender(<Activity clock={clock} paused />);
    time.pass(300_000);
    expect(clock.now() - shown).toBe(1000);
    rerender(<Activity clock={clock} paused={false} />);
    time.pass(2000);
    expect(clock.now() - shown).toBe(3000);
  });

  it('lets the clock go when it is left while paused: the next thing to use the clock finds it running', () => {
    const time = wall();
    const clock = createPlayClock(time.read);
    const { unmount } = render(<Activity clock={clock} paused />);
    time.pass(5000);
    act(() => unmount());
    const from = clock.now();
    time.pass(1000);
    expect(clock.now() - from).toBe(1000);
  });
});
