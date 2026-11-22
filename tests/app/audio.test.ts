import { describe, expect, it, vi } from 'vitest';
import { AudioEngine, type AudioContextLike } from '@/audio/audioEngine';

function fakeContext(initialState = 'suspended') {
  const param = () => ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const oscillators: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    type: string;
  }[] = [];
  const context = {
    state: initialState,
    currentTime: 3,
    destination: {},
    resume: vi.fn(() => {
      context.state = 'running';
      return Promise.resolve();
    }),
    createOscillator: vi.fn(() => {
      const oscillator = {
        type: 'sine',
        frequency: param(),
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(oscillator);
      return oscillator;
    }),
    createGain: vi.fn(() => ({ gain: param(), connect: vi.fn() })),
  };
  return { context: context as unknown as AudioContextLike & typeof context, oscillators };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the audio engine', () => {
  it('makes no sound and creates no audio context while sound is off', () => {
    const create = vi.fn();
    const engine = new AudioEngine(create, false);
    engine.unlock();
    expect(engine.state).toBe('muted');
    expect(engine.play('tap')).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it('stays silent until the first touch, as browsers require', () => {
    const { context } = fakeContext();
    const create = vi.fn(() => context);
    const engine = new AudioEngine(create, true);
    expect(engine.state).toBe('locked');
    expect(engine.play('tap')).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it('unlocks on a gesture, once, and then plays', async () => {
    const { context, oscillators } = fakeContext();
    const create = vi.fn(() => context);
    const engine = new AudioEngine(create, true);
    engine.unlock();
    await settle();
    engine.unlock();
    expect(create).toHaveBeenCalledTimes(1);
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(engine.state).toBe('ready');

    expect(engine.play('success')).toBe(true);
    expect(oscillators).toHaveLength(3);
    for (const oscillator of oscillators) {
      expect(oscillator.start).toHaveBeenCalledTimes(1);
      expect(oscillator.stop).toHaveBeenCalledTimes(1);
      // Scheduled just after "now", never in the past.
      expect(oscillator.start.mock.calls[0]?.[0]).toBeGreaterThan(3);
    }
    expect(engine.stats).toEqual({ played: 1, failed: 0 });
  });

  it('every cue is short and quiet', async () => {
    const { context } = fakeContext('running');
    const levels: number[] = [];
    const ends: number[] = [];
    context.createGain = vi.fn(() => ({
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn((level: number) => levels.push(level)),
        exponentialRampToValueAtTime: vi.fn((_level: number, time: number) => ends.push(time)),
      },
      connect: vi.fn(),
    }));
    const engine = new AudioEngine(() => context, true);
    engine.unlock();
    for (const cue of ['tap', 'on', 'off', 'success', 'again', 'step'] as const) engine.play(cue);
    expect(Math.max(...levels)).toBeLessThanOrEqual(0.2);
    expect(Math.max(...ends) - context.currentTime).toBeLessThan(0.7);
  });

  it('wakes a context the browser has suspended (a phone call, a tab switch)', async () => {
    const { context } = fakeContext('running');
    const engine = new AudioEngine(() => context, true);
    engine.unlock();
    expect(engine.play('tap')).toBe(true);

    context.state = 'interrupted';
    expect(engine.state).toBe('locked');
    expect(engine.play('tap')).toBe(false);
    engine.unlock();
    await settle();
    expect(engine.play('tap')).toBe(true);
  });

  it('keeps trying on later gestures when the browser refuses to resume', async () => {
    const { context } = fakeContext();
    context.resume = vi.fn(() => Promise.reject(new Error('not allowed')));
    const engine = new AudioEngine(() => context, true);
    engine.unlock();
    await settle();
    expect(engine.state).toBe('locked');
    engine.unlock();
    await settle();
    expect(context.resume).toHaveBeenCalledTimes(2);
  });

  it('reports a browser with no Web Audio as unavailable, without throwing', () => {
    const none = new AudioEngine(() => null, true);
    none.unlock();
    expect(none.state).toBe('unavailable');
    expect(none.play('tap')).toBe(false);

    const throwing = new AudioEngine(() => {
      throw new Error('blocked');
    }, true);
    expect(() => throwing.unlock()).not.toThrow();
    expect(throwing.state).toBe('unavailable');
  });

  it('skips a cue that cannot be scheduled instead of breaking the game', () => {
    const { context } = fakeContext('running');
    context.createOscillator = vi.fn(() => {
      throw new Error('too many nodes');
    });
    const engine = new AudioEngine(() => context, true);
    engine.unlock();
    expect(engine.play('tap')).toBe(false);
    expect(engine.stats).toEqual({ played: 0, failed: 1 });
  });

  it('follows the sound setting and tells subscribers', () => {
    const { context } = fakeContext('running');
    const engine = new AudioEngine(() => context, true);
    engine.unlock();
    const listener = vi.fn();
    engine.subscribe(listener);
    engine.setEnabled(false);
    expect(engine.state).toBe('muted');
    expect(engine.play('tap')).toBe(false);
    engine.setEnabled(true);
    expect(engine.play('tap')).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
    engine.setEnabled(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
