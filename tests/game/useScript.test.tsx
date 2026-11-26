// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REST, Writer, type Beat, type Script } from '@/game/lesson/script';
import { useScript } from '@/game/lesson/useScript';

/**
 * The player of scripts: which beat a board is given at each moment. (What the beats and the sounds of a script
 * are is tested with the scripts themselves; this is about when they arrive.)
 */

const seen: Beat[] = [];
/** Whether the run was over, each time the board was drawn. */
const overs: boolean[] = [];

function Board({
  script,
  run = 'one',
  active = true,
  calm = false,
}: {
  script: Script;
  run?: string;
  active?: boolean;
  calm?: boolean;
}) {
  const { beat, over } = useScript(script, run, active, calm);
  seen.push(beat);
  overs.push(over);
  return <output data-beat={JSON.stringify(beat)} />;
}

const BEFORE: Beat = { show: 'name', which: 'prompt', part: 0 };
const AFTER: Beat = { show: 'name', which: 'prompt', part: 1 };

/** A script that opens with something at its very first moment, as a story does. */
const story = () => new Writer().beat(BEFORE).wait(900).beat(AFTER).wait(500).end(REST);
/** A script that opens with a pause, as most do. */
const question = () => new Writer().wait(250).beat({ show: 'ask' }).wait(1100).end(REST);

beforeEach(() => {
  seen.length = 0;
  overs.length = 0;
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('playing a script', () => {
  it('shows what the script opens with from the very first frame, where it opens with anything', () => {
    render(<Board script={story()} />);
    // Before any time has passed: not a single frame of the story already over.
    expect(seen).toEqual([BEFORE]);
    act(() => void vi.advanceTimersByTime(0));
    expect(seen.at(-1)).toEqual(BEFORE);
    act(() => void vi.advanceTimersByTime(900));
    expect(seen.at(-1)).toEqual(AFTER);
    act(() => void vi.advanceTimersByTime(500));
    expect(seen.at(-1)).toEqual(REST);
  });

  it('is at rest until the first moment of a script that opens with a pause', () => {
    render(<Board script={question()} />);
    expect(seen).toEqual([REST]);
    act(() => void vi.advanceTimersByTime(249));
    expect(seen.at(-1)).toEqual(REST);
    act(() => void vi.advanceTimersByTime(1));
    expect(seen.at(-1)).toEqual({ show: 'ask' });
  });

  it('starts from the top, opening and all, when it is run again', () => {
    const script = story();
    const { rerender } = render(<Board script={script} />);
    act(() => void vi.advanceTimersByTime(1000));
    expect(seen.at(-1)).toEqual(AFTER);
    rerender(<Board script={script} run="two" />);
    expect(seen.at(-1)).toEqual(BEFORE);
  });

  it('is at rest while nothing is playing: a paused story is not held at its beginning', () => {
    render(<Board script={story()} active={false} />);
    expect(seen).toEqual([REST]);
  });

  it('goes straight to where the script comes to rest for someone who has asked for less movement', () => {
    render(<Board script={story()} calm />);
    expect(seen).toEqual([REST]);
    act(() => void vi.advanceTimersByTime(2000));
    expect(seen.at(-1)).toEqual(REST);
  });

  it('says a run is over when the script has come to rest, and not a moment before', () => {
    // A question: a pause, the asking, and rest 1350 thousandths of a second after it began.
    render(<Board script={question()} />);
    expect(overs).toEqual([false]);
    act(() => void vi.advanceTimersByTime(250));
    expect(seen.at(-1)).toEqual({ show: 'ask' });
    act(() => void vi.advanceTimersByTime(1099));
    // Still being asked: an answer may be lifted at this moment.
    expect(seen.at(-1)).toEqual({ show: 'ask' });
    expect(overs).not.toContain(true);
    act(() => void vi.advanceTimersByTime(1));
    expect(seen.at(-1)).toEqual(REST);
    expect(overs.at(-1)).toBe(true);
    // And it stays over.
    act(() => void vi.advanceTimersByTime(5000));
    expect(overs.at(-1)).toBe(true);
  });

  it('is not over from the first frame of a new run, though the run before it was', () => {
    const script = question();
    const { rerender } = render(<Board script={script} />);
    act(() => void vi.advanceTimersByTime(1350));
    expect(overs.at(-1)).toBe(true);
    overs.length = 0;
    rerender(<Board script={script} run="two" />);
    // Not one drawing of the new run with the old run's word that it was over.
    expect(overs).not.toContain(true);
    act(() => void vi.advanceTimersByTime(1349));
    expect(overs).not.toContain(true);
    act(() => void vi.advanceTimersByTime(1));
    expect(overs.at(-1)).toBe(true);
  });

  it('is over at once where nothing moves, and never while nothing is playing', () => {
    render(<Board script={question()} calm />);
    expect(overs).toEqual([true]);
    cleanup();
    overs.length = 0;
    render(<Board script={question()} active={false} />);
    act(() => void vi.advanceTimersByTime(5000));
    expect(overs).not.toContain(true);
  });

  it('is over for a script with nothing in it but where it rests', () => {
    render(<Board script={new Writer().end(REST)} />);
    act(() => void vi.advanceTimersByTime(0));
    expect(seen.at(-1)).toEqual(REST);
    expect(overs.at(-1)).toBe(true);
  });
});
