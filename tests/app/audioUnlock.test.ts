// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio, installAudioUnlock } from '@/audio';

/**
 * The audio is woken by every press, and whoever listens for a change in it is told only when the press is over.
 *
 * Told in the middle of a press, the page re-draws in the middle of it, and the thing under the finger can be
 * taken out of the page before the game has been given the press. That happened in CI, in Safari's engine
 * (`e2e/help.spec.ts` stages it in a browser; this holds the rule itself).
 */

/** A browser's audio that is awake as soon as it is made, as it is where a press is all a browser asks for. */
class AwakeAtOnce {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = () => Promise.resolve();
  decodeAudioData = () => Promise.resolve(null);
  createBufferSource = () => ({});
}

const pressOn = (target: Element, type = 'pointerdown') =>
  target.dispatchEvent(new Event(type, { bubbles: true }));

describe('waking the audio at a press', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('wakes it inside the press, and tells whoever is listening only when the press is over', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = AwakeAtOnce;
    installAudioUnlock(window);
    const told = vi.fn();
    audio().subscribe(told);
    expect(audio().state).toBe('locked');

    // Something further along the way of the press, as the game is: what does it find?
    const found: { awake: boolean; told: number }[] = [];
    document.addEventListener(
      'pointerdown',
      () => found.push({ awake: audio().canPlayClips, told: told.mock.calls.length }),
      true,
    );
    pressOn(document.body);
    // The audio was awake by then, and nobody had been told.
    expect(found).toEqual([{ awake: true, told: 0 }]);
    expect(told).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(told).toHaveBeenCalledTimes(1);
  });

  it('tells once for a run of presses, keys and lifted fingers that come before it has told', () => {
    const told = vi.fn();
    audio().subscribe(told);
    pressOn(document.body);
    pressOn(document.body, 'touchend');
    pressOn(document.body, 'keydown');
    pressOn(document.body);
    expect(told).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(told).toHaveBeenCalledTimes(1);
    // And again for the next press: it is told after each, not once for ever.
    pressOn(document.body);
    vi.runAllTimers();
    expect(told).toHaveBeenCalledTimes(2);
  });
});
