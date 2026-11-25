// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OCTAVE } from '@/engine';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The Music Lab's room for playing in. What is tried here is that every bar is there and plays its own note the
 * moment it is pressed, once; that the drum does; and that with the sound off the room says so instead of
 * offering an instrument that makes none. How it fits a screen, and the beat, are tried in a browser.
 */

const played: string[] = [];
let state = 'ready';
const unlock = vi.fn();
const setSettings = vi.fn();

vi.mock('@/audio', () => ({
  DRUM_HZ: 150,
  TICK_HZ: 1150,
  audio: () => ({
    subscribe: () => () => undefined,
    get state() {
      return state;
    },
    clock: null,
    unlock,
  }),
  playTone: (timbre: string, pitch: string | number) => {
    played.push(`${timbre}:${String(pitch)}`);
    return true;
  },
}));
vi.mock('@/app/settings', () => ({
  settingsStore: () => ({ set: setSettings }),
}));

beforeEach(() => {
  played.length = 0;
  state = 'ready';
  unlock.mockClear();
  setSettings.mockClear();
});
afterEach(cleanup);

async function room() {
  const { default: Room } = await import('@/game/worlds/music-lab/Room');
  return render(<Room />);
}

describe('the room for playing in', () => {
  it('has the whole octave, lowest first, each bar called by its note', async () => {
    await room();
    const bars = screen.getAllByRole('button', { name: /^Chime bar/ });
    expect(bars.map((bar) => bar.getAttribute('data-note'))).toEqual([...OCTAVE]);
    expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual([
      'Chime bar: C',
      'Chime bar: D',
      'Chime bar: E',
      'Chime bar: F',
      'Chime bar: G',
      'Chime bar: A',
      'Chime bar: B',
      'Chime bar: high C',
    ]);
  });

  it('plays a bar the moment it is touched, and once: not again when the finger lifts', async () => {
    await room();
    const g = screen.getByRole('button', { name: 'Chime bar: G' });
    fireEvent.pointerDown(g, { pointerType: 'touch', button: 0 });
    expect(played).toEqual(['bar:g4']);
    expect(g.getAttribute('data-lit')).toBe('true');
    // The click a browser sends when the finger lifts is the same tap.
    fireEvent.click(g);
    expect(played).toEqual(['bar:g4']);
    // Two bars at once are two notes.
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Chime bar: C' }), {
      pointerType: 'touch',
      button: 0,
    });
    expect(played).toEqual(['bar:g4', 'bar:c4']);
  });

  it('plays for a key on a keyboard too, which reaches a button only as a click', async () => {
    await room();
    fireEvent.click(screen.getByRole('button', { name: 'Chime bar: E' }));
    fireEvent.click(screen.getByRole('button', { name: 'The drum' }));
    expect(played).toEqual(['bar:e4', 'drum:150']);
  });

  it('takes no note from a button of the mouse that is not the first', async () => {
    await room();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Chime bar: E' }), {
      pointerType: 'mouse',
      button: 2,
    });
    expect(played).toEqual([]);
  });

  it('has a way back to the Music Lab, and says it keeps nothing', async () => {
    await room();
    expect(screen.getByRole('link', { name: 'Back to the Music Lab' }).getAttribute('href')).toBe(
      '/world/music-lab',
    );
    expect(screen.getByText(/nothing is asked here and nothing is kept/)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Start the beat' }).getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('with the sound switched off offers no instrument, and one thing to press that switches it on', async () => {
    state = 'muted';
    await room();
    expect(screen.queryAllByRole('button', { name: /^Chime bar/ })).toEqual([]);
    expect(screen.queryByRole('button', { name: 'The drum' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Turn the sound on' }));
    expect(setSettings).toHaveBeenCalledWith({ sound: true });
    expect(unlock).toHaveBeenCalledTimes(1);
  });
});
