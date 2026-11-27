// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Services from '@/game/services';
import type { Repository } from '@/storage';
import { freshBackend, repositoryOn } from '../helpers/storage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * How long has been played in a sitting, and when a sitting of the length a grown-up chose is over. Only time
 * in an activity counts; half an hour away begins another sitting; and where no length is chosen, it is never
 * over.
 */

const KEY = 'training-academy.sitting';
const MINUTE = 60_000;
const NOON = Date.UTC(2026, 10, 2, 12, 0, 0);

let repository: Repository;
const clock = { now: NOON };
vi.mock('@/game/services', async (original) => ({
  ...(await original<typeof Services>()),
  getRepository: () => Promise.resolve(repository),
  now: () => clock.now,
}));

beforeEach(async () => {
  vi.resetModules();
  window.sessionStorage.clear();
  repository = await repositoryOn(freshBackend('memory'));
  clock.now = NOON;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const sitting = () => import('@/game/sitting');

describe('the time played in a sitting', () => {
  it('is nothing until something has been played, and then what has been added', async () => {
    const { notePlay, playedInSitting } = await sitting();
    expect(playedInSitting(NOON)).toBe(0);
    notePlay(1000, NOON);
    notePlay(1000, NOON + 1000);
    notePlay(500, NOON + 2000);
    expect(playedInSitting(NOON + 2000)).toBe(2500);
    // Nothing is added for no time, or for less than none.
    notePlay(0, NOON + 3000);
    notePlay(-1000, NOON + 3000);
    notePlay(Number.NaN, NOON + 3000);
    expect(playedInSitting(NOON + 3000)).toBe(2500);
  });

  it('goes on after a break of less than half an hour, and begins again after a longer one', async () => {
    const { SITTING_GAP_MS, notePlay, playedInSitting } = await sitting();
    notePlay(5 * MINUTE, NOON);
    expect(playedInSitting(NOON + SITTING_GAP_MS)).toBe(5 * MINUTE);
    notePlay(MINUTE, NOON + SITTING_GAP_MS);
    expect(playedInSitting(NOON + SITTING_GAP_MS)).toBe(6 * MINUTE);
    // Half an hour and a moment after the last of it: another sitting.
    const later = NOON + 2 * SITTING_GAP_MS + 1;
    expect(playedInSitting(later)).toBe(0);
    notePlay(MINUTE, later);
    expect(playedInSitting(later)).toBe(MINUTE);
  });

  it('begins again when the clock has gone back, and goes on when it has only slipped', async () => {
    const { notePlay, playedInSitting } = await sitting();
    notePlay(5 * MINUTE, NOON);
    expect(playedInSitting(NOON - 30_000)).toBe(5 * MINUTE);
    expect(playedInSitting(NOON - 2 * MINUTE)).toBe(0);
  });

  it('is kept for the visit, and is nothing where what is kept is not a count of time', async () => {
    const { notePlay, playedInSitting } = await sitting();
    notePlay(3 * MINUTE, NOON);
    expect(JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null')).toEqual({
      playedMs: 3 * MINUTE,
      lastAt: NOON,
    });
    // Not a count of time at all; a count that is not a number; and one below nothing, dated this moment.
    for (const kept of [
      '',
      'soon',
      'null',
      '[]',
      `{"playedMs":"long","lastAt":${String(NOON)}}`,
      `{"playedMs":-5,"lastAt":${String(NOON)}}`,
      `{"playedMs":5000,"lastAt":"now"}`,
    ]) {
      window.sessionStorage.setItem(KEY, kept);
      expect(playedInSitting(NOON), kept).toBe(0);
    }
    // And what is a count of time, dated this moment, is believed.
    window.sessionStorage.setItem(KEY, `{"playedMs":5000,"lastAt":${String(NOON)}}`);
    expect(playedInSitting(NOON)).toBe(5000);
  });

  it('is never over where it cannot be kept: a device that refuses storage is not told to rest', async () => {
    const { isTimeToRest, notePlay, playedInSitting } = await sitting();
    // A browser that blocks a site's storage refuses even to hand it over.
    const real = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('Storage is blocked.');
      },
    });
    try {
      notePlay(30 * MINUTE, NOON);
      expect(playedInSitting(NOON)).toBe(0);
      expect(isTimeToRest(10, NOON)).toBe(false);
    } finally {
      if (real) Object.defineProperty(window, 'sessionStorage', real);
    }
    // And with storage back, nothing of that was kept.
    expect(playedInSitting(NOON)).toBe(0);
  });
});

describe('time to rest', () => {
  it('is when a sitting of the length chosen has been played, and not a moment before', async () => {
    const { isTimeToRest, notePlay } = await sitting();
    notePlay(10 * MINUTE - 1000, NOON);
    expect(isTimeToRest(10, NOON)).toBe(false);
    notePlay(1000, NOON);
    expect(isTimeToRest(10, NOON)).toBe(true);
    expect(isTimeToRest(15, NOON)).toBe(false);
  });

  it('never comes where no length was chosen', async () => {
    const { isTimeToRest, notePlay } = await sitting();
    notePlay(600 * MINUTE, NOON);
    expect(isTimeToRest(null, NOON)).toBe(false);
    expect(isTimeToRest(undefined, NOON)).toBe(false);
    expect(isTimeToRest(0, NOON)).toBe(false);
  });

  it('is over again after half an hour away', async () => {
    const { SITTING_GAP_MS, isTimeToRest, notePlay } = await sitting();
    notePlay(12 * MINUTE, NOON);
    expect(isTimeToRest(10, NOON + MINUTE)).toBe(true);
    expect(isTimeToRest(10, NOON + SITTING_GAP_MS + 1)).toBe(false);
  });
});

describe('the clock of a sitting', () => {
  async function playing(on: boolean) {
    const { useSittingClock } = await sitting();
    function Activity({ inPlay }: { inPlay: boolean }) {
      useSittingClock(inPlay);
      return null;
    }
    return render(<Activity inPlay={on} />);
  }
  /** Let so many seconds go by, on the page's timers and on the clock the game reads. */
  const seconds = (count: number) => {
    for (let second = 0; second < count; second++) {
      clock.now += 1000;
      act(() => void vi.advanceTimersByTime(1000));
    }
  };

  it('adds a second for every second an activity is in play, and nothing while it is not', async () => {
    vi.useFakeTimers();
    const { playedInSitting } = await sitting();
    const page = await playing(true);
    seconds(90);
    expect(playedInSitting(clock.now)).toBe(90_000);
    // Paused, finished, or still getting ready: nothing is added.
    const { useSittingClock } = await sitting();
    function Activity({ inPlay }: { inPlay: boolean }) {
      useSittingClock(inPlay);
      return null;
    }
    page.rerender(<Activity inPlay={false} />);
    seconds(60);
    expect(playedInSitting(clock.now)).toBe(90_000);
    page.rerender(<Activity inPlay />);
    seconds(10);
    expect(playedInSitting(clock.now)).toBe(100_000);
    // And nothing once the activity has been left.
    page.unmount();
    seconds(60);
    expect(playedInSitting(clock.now)).toBe(100_000);
  });

  it('adds nothing while the page is out of sight', async () => {
    vi.useFakeTimers();
    const { playedInSitting } = await sitting();
    await playing(true);
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('hidden');
    seconds(45);
    expect(playedInSitting(clock.now)).toBe(0);
    visibility.mockReturnValue('visible');
    seconds(5);
    expect(playedInSitting(clock.now)).toBe(5000);
  });
});

describe('time to rest, for the player who is playing', () => {
  async function show(minutes: 10 | 15 | 20 | null): Promise<void> {
    const profile = await repository.createProfile({ name: 'Robin', avatar: 'leaf' });
    await repository.setActiveProfileId(profile.id);
    await repository.updateProfile(profile.id, { settings: { sessionMinutes: minutes } });
    const { useTimeToRest } = await sitting();
    const { refreshProfiles } = await import('@/game/profiles');
    await refreshProfiles();
    function Told() {
      const { rest, minutes: length } = useTimeToRest();
      return <output data-testid="rest">{`${String(rest)} ${String(length)}`}</output>;
    }
    render(<Told />);
  }
  const told = () => screen.getByTestId('rest').textContent;

  it('comes when their sitting has been played out, as the time is added', async () => {
    await show(10);
    const { notePlay } = await sitting();
    expect(told()).toBe('false 10');
    act(() => notePlay(9 * MINUTE + 59_000, NOON));
    expect(told()).toBe('false 10');
    act(() => notePlay(1000, NOON));
    expect(told()).toBe('true 10');
  });

  it('never comes for a player with no length chosen, however long they play', async () => {
    await show(null);
    const { notePlay } = await sitting();
    act(() => notePlay(300 * MINUTE, NOON));
    expect(told()).toBe('false null');
  });

  it('is over by itself half an hour after the last of the play, on a page that is simply left open', async () => {
    vi.useFakeTimers();
    await show(10);
    const { notePlay, SITTING_GAP_MS } = await sitting();
    act(() => notePlay(10 * MINUTE, NOON));
    expect(told()).toBe('true 10');
    // Twenty-nine minutes on, looked at every minute: still time to rest.
    for (let minute = 0; minute < 29; minute++) {
      clock.now += MINUTE;
      act(() => void vi.advanceTimersByTime(MINUTE));
    }
    expect(told()).toBe('true 10');
    // Past the half hour: nothing is played and nothing is pressed, and within a minute it is another sitting.
    clock.now = NOON + SITTING_GAP_MS + 1;
    expect(told()).toBe('true 10');
    act(() => void vi.advanceTimersByTime(MINUTE));
    expect(told()).toBe('false 10');
  });

  it('is asked again when the page comes back into sight, without waiting for the minute', async () => {
    vi.useFakeTimers();
    await show(10);
    const { notePlay, SITTING_GAP_MS } = await sitting();
    act(() => notePlay(10 * MINUTE, NOON));
    expect(told()).toBe('true 10');
    clock.now = NOON + SITTING_GAP_MS + 1;
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    expect(told()).toBe('false 10');
    // And when a page kept by the browser is shown again.
    act(() => notePlay(10 * MINUTE, clock.now));
    expect(told()).toBe('true 10');
    clock.now += SITTING_GAP_MS + 1;
    act(() => void window.dispatchEvent(new Event('pageshow')));
    expect(told()).toBe('false 10');
  });

  it('is looked for only while something is drawn by it: nothing is left running or listening when the page has gone', async () => {
    vi.useFakeTimers();
    const fromDocument = vi.spyOn(document, 'removeEventListener');
    const fromWindow = vi.spyOn(window, 'removeEventListener');
    await show(10);
    expect(vi.getTimerCount()).toBe(1);
    expect(fromDocument).not.toHaveBeenCalledWith('visibilitychange', expect.anything());
    cleanup();
    expect(vi.getTimerCount()).toBe(0);
    expect(fromDocument).toHaveBeenCalledWith('visibilitychange', expect.anything());
    expect(fromWindow).toHaveBeenCalledWith('pageshow', expect.anything());
  });

  it('is looked for once however many things are drawn by it, and for as long as any of them is', async () => {
    vi.useFakeTimers();
    await show(10);
    const { useTimeToRest, notePlay, SITTING_GAP_MS, LOOK_AGAIN_MS } = await sitting();
    function Other() {
      const { rest } = useTimeToRest();
      return <output data-testid="other">{String(rest)}</output>;
    }
    const other = render(<Other />);
    // Two things on the page ask; there is one look a minute, not two.
    expect(vi.getTimerCount()).toBe(1);
    act(() => notePlay(10 * MINUTE, NOON));
    expect(told()).toBe('true 10');
    expect(screen.getByTestId('other').textContent).toBe('true');
    // One of them goes: the other is still told when the sitting ends by itself.
    other.unmount();
    expect(vi.getTimerCount()).toBe(1);
    clock.now = NOON + SITTING_GAP_MS + 1;
    act(() => void vi.advanceTimersByTime(LOOK_AGAIN_MS));
    expect(told()).toBe('false 10');
  });

  it('is not said where nobody is playing', async () => {
    const { useTimeToRest, notePlay } = await sitting();
    function Told() {
      const { rest, minutes } = useTimeToRest();
      return <output data-testid="rest">{`${String(rest)} ${String(minutes)}`}</output>;
    }
    render(<Told />);
    act(() => notePlay(300 * MINUTE, NOON));
    expect(told()).toBe('false null');
  });
});
