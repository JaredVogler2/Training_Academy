// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHOOSE, IDLE_MS } from '@/game/howto/steps';
import lengths from '@/voice/timings/common.json';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * "How to play" on a screen, with the voice and the clock in the test's hands: when each line is said, and what
 * is written down about the player on the way out.
 */

const seconds: Record<string, number> = lengths;

const heard = vi.hoisted(() => ({
  /** Every line asked for, and when, by the test's clock. */
  said: [] as { line: string; at: number }[],
  quiet: [] as string[],
  /** Whether the voice can be heard: a phone's is not, until a touch has woken it. */
  awake: true,
  began: 0,
}));

vi.mock('@/audio', () => ({
  addVoice: () => undefined,
  hushVoice: () => undefined,
  playCount: () => undefined,
  playCue: () => undefined,
  playTone: () => true,
  sayLine: (line: string) => heard.said.push({ line, at: Date.now() - heard.began }),
  sayLineIfQuiet: (line: string) => {
    heard.quiet.push(line);
    return true;
  },
  voice: () => ({
    prepare: () => undefined,
    seconds: (line: string) => (heard.awake ? (seconds[line] ?? 0) : 0),
  }),
}));
vi.mock('@/voice/common', () => ({ commonVoice: { urls: {}, seconds: {} } }));

const went = vi.hoisted(() => ({ to: [] as unknown[] }));
vi.mock('@/app/navigation', () => ({
  navigate: (...where: unknown[]) => went.to.push(where),
  // A link that tells whoever asked of a click, as the real one does, and goes nowhere by itself here.
  Link: ({ children, to: _to, ...rest }: { children?: unknown; to?: unknown }) => (
    <a href="/" {...rest}>
      {children as never}
    </a>
  ),
}));

const players = vi.hoisted(() => ({
  playing: null as { id: string; settings: Record<string, unknown> } | null,
  updates: [] as unknown[],
  /** What writing a player down comes to: at once and well, unless a test holds it or makes it fail. */
  written: (): Promise<void> => Promise.resolve(),
}));
vi.mock('@/game/profiles', () => ({
  refreshProfiles: () => Promise.resolve({ profiles: [], activeId: null }),
  activeProfile: () => players.playing,
  updateProfile: (...update: unknown[]) => {
    players.updates.push(update);
    return players.written();
  },
}));
const recorded = vi.hoisted(() => ({ errors: [] as unknown[] }));
vi.mock('@/app/diagnostics', () => ({
  recordError: (...error: unknown[]) => recorded.errors.push(error),
}));

beforeEach(() => {
  vi.useFakeTimers();
  heard.said = [];
  heard.quiet = [];
  heard.awake = true;
  heard.began = Date.now();
  went.to = [];
  players.playing = { id: 'p1', settings: { sessionMinutes: null } };
  players.updates = [];
  players.written = () => Promise.resolve();
  recorded.errors = [];
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const wait = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};
const page = () => screen.getByTestId('how-to');
const lineAt = (line: string) => heard.said.find((each) => each.line === line)?.at ?? Number.NaN;
const lasts = (line: string) => (seconds[line] ?? 0) * 1000;

async function open() {
  const { default: HowToPlay } = await import('@/game/howto/HowToPlay');
  return render(<HowToPlay />);
}

describe('how to play, on a screen', () => {
  it('says each line when the one before it is over', async () => {
    await open();
    wait(20_000);
    expect(heard.said.map((each) => each.line)).toEqual(['howto.hello', 'howto.choose']);
    expect(lineAt('howto.choose')).toBeGreaterThanOrEqual(
      lineAt('howto.hello') + lasts('howto.hello'),
    );
    expect(page().getAttribute('data-phase')).toBe('turn');
  });

  it('keeps time with a voice that wakes a moment after the page has opened', async () => {
    // The tap that brings a new player here is the tap that wakes a phone's sound, and waking takes a moment:
    // when the page opens, nothing can be heard yet. By the first line, it can.
    heard.awake = false;
    await open();
    wait(300);
    heard.awake = true;
    wait(20_000);
    expect(heard.said.map((each) => each.line)).toEqual(['howto.hello', 'howto.choose']);
    // The second line does not begin on top of the first one's last word.
    expect(lineAt('howto.choose')).toBeGreaterThanOrEqual(
      lineAt('howto.hello') + lasts('howto.hello'),
    );
  });

  it('gives each line its time where nothing can be heard at all', async () => {
    heard.awake = false;
    await open();
    wait(1000);
    expect(page().getAttribute('data-phase')).toBe('show');
    wait(20_000);
    expect(page().getAttribute('data-phase')).toBe('turn');
    // A second and a half, and the moment a timer takes to follow another.
    const apart = lineAt('howto.choose') - lineAt('howto.hello');
    expect(apart).toBeGreaterThanOrEqual(1500);
    expect(apart).toBeLessThan(1520);
  });

  it('says what there is to tap once, when nothing has been tapped for a while', async () => {
    await open();
    wait(8000);
    expect(page().getAttribute('data-phase')).toBe('turn');
    expect(heard.quiet).toEqual([]);
    wait(IDLE_MS + 100);
    expect(heard.quiet).toEqual(['help.answers']);
    expect(screen.getByTestId('how-to-hand').getAttribute('data-on')).toBe(
      `choice:${CHOOSE.turn.same}`,
    );
    wait(IDLE_MS * 3);
    expect(heard.quiet).toEqual(['help.answers']);
  });

  it('says "yes" when the child has done it, and nothing to someone who only looks', async () => {
    await open();
    wait(8000);
    const before = heard.said.length;
    fireEvent.click(screen.getByRole('button', { name: CHOOSE.turn.same }));
    expect(page().getAttribute('data-phase')).toBe('done');
    expect(heard.said.slice(before).map((each) => each.line)).toEqual(['howto.yes']);
  });
});

describe('leaving how to play', () => {
  it('writes down that this player has been shown, keeping everything else about them', async () => {
    players.playing = {
      id: 'p1',
      settings: { sessionMinutes: 15, startAt: { 'number-garden': 'x' } },
    };
    const { unmount } = await open();
    expect(players.updates).toEqual([]);
    unmount();
    await vi.runAllTimersAsync();
    expect(players.updates).toEqual([
      [
        'p1',
        { settings: { sessionMinutes: 15, startAt: { 'number-garden': 'x' }, howTo: 'seen' } },
      ],
    ]);
  });

  it('passed by, by the house: writes it down first, and leaves only when it has been written', async () => {
    // Writing is slow this time: the test says when it is done. (One writing, however often it is asked for.)
    let done: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      done = resolve;
    });
    players.written = () => held;
    await open();
    const house = screen.getByRole('link', { name: 'Skip: go to the islands' });
    fireEvent.click(house);
    await vi.advanceTimersByTimeAsync(50);
    // It is being written, and the page has not been left: a page that is left can be closed before it is.
    expect(players.updates).toEqual([
      ['p1', { settings: { sessionMinutes: null, howTo: 'seen' } }],
    ]);
    expect(went.to).toEqual([]);
    // A second tap while it waits is not a second writing, and will not be a second leaving.
    fireEvent.click(house);
    await vi.advanceTimersByTimeAsync(50);
    expect(players.updates).toHaveLength(1);
    expect(went.to).toEqual([]);
    done();
    await vi.advanceTimersByTimeAsync(50);
    expect(went.to).toEqual([[{ name: 'home' }]]);
  });

  it('passed by, where it cannot be written: says so to the diagnostics, and still goes to the islands', async () => {
    players.written = () => Promise.reject(new Error('The disk is full.'));
    await open();
    fireEvent.click(screen.getByRole('link', { name: 'Skip: go to the islands' }));
    await vi.advanceTimersByTimeAsync(50);
    expect(went.to).toEqual([[{ name: 'home' }]]);
    expect(recorded.errors).toHaveLength(1);
  });

  it('opened in another tab, the house is an ordinary link: nothing is written and nothing is held', async () => {
    await open();
    const house = screen.getByRole('link', { name: 'Skip: go to the islands' });
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    house.dispatchEvent(click);
    await vi.advanceTimersByTimeAsync(50);
    expect(click.defaultPrevented).toBe(false);
    expect(players.updates).toEqual([]);
    expect(went.to).toEqual([]);
  });

  it('writes it down as soon as the last of the three is done, before anyone leaves', async () => {
    await open();
    const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    wait(8000);
    fireEvent.click(screen.getByRole('button', { name: CHOOSE.turn.same }));
    next();
    wait(12_000);
    fireEvent.click(screen.getByRole('button', { name: 'apple' }));
    fireEvent.click(screen.getByRole('button', { name: 'hen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    next();
    wait(8000);
    // Two of the three done is not shown.
    await vi.advanceTimersByTimeAsync(0);
    expect(players.updates).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Show me again' }));
    await vi.advanceTimersByTimeAsync(0);
    expect(players.updates).toEqual([
      ['p1', { settings: { sessionMinutes: null, howTo: 'seen' } }],
    ]);
    expect(page().getAttribute('data-phase')).toBe('done');
  });

  it('writes nothing for a player who has been shown before, or where nobody is playing', async () => {
    players.playing = { id: 'p1', settings: { sessionMinutes: null, howTo: 'seen' } };
    (await open()).unmount();
    await vi.runAllTimersAsync();
    players.playing = null;
    (await open()).unmount();
    await vi.runAllTimersAsync();
    expect(players.updates).toEqual([]);
  });

  it('goes on to the islands when the last of the three is done, and not back into it', async () => {
    await open();
    const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    wait(8000);
    fireEvent.click(screen.getByRole('button', { name: CHOOSE.turn.same }));
    next();
    wait(12_000);
    fireEvent.click(screen.getByRole('button', { name: 'apple' }));
    fireEvent.click(screen.getByRole('button', { name: 'hen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    next();
    wait(8000);
    expect(went.to).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Show me again' }));
    next();
    expect(went.to).toEqual([[{ name: 'home' }, { replace: true }]]);
  });
});
