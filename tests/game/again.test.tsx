// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAgain } from '@/game/lesson/frame';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/audio', () => ({ playCue: vi.fn(), voice: () => ({ prepare: vi.fn() }) }));

afterEach(cleanup);

/**
 * Asking to be told again. Two faults were found in it together: it was remembered from step to step, so that one
 * tap on the guide took the first showing away from every step after it; and a tap before a showing was over took
 * that showing away as well.
 */

function Asker({ step }: { step: number }) {
  const { asked, again, ask } = useAgain(step);
  return (
    <div>
      <p data-testid="told">{`asked ${String(asked)}, ${again ? 'the words only' : 'from the top'}`}</p>
      <button onClick={() => ask()}>ask</button>
      <button onClick={() => ask(false)}>ask before it is over</button>
      {/* As a button would if it were handed `ask` itself: with the tap's own event. */}
      <button onClick={(event) => (ask as (given: unknown) => void)(event)}>
        ask with the tap
      </button>
    </div>
  );
}

const told = () => screen.getByTestId('told').textContent;
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('asking to be told again', () => {
  it('is for the words only, once what the step shows has been seen', () => {
    render(<Asker step={3} />);
    expect(told()).toBe('asked 0, from the top');
    press('ask');
    expect(told()).toBe('asked 1, the words only');
    press('ask');
    expect(told()).toBe('asked 2, the words only');
  });

  it('belongs to one step: the next starts as if nothing had been asked', () => {
    const { rerender } = render(<Asker step={3} />);
    press('ask');
    expect(told()).toBe('asked 1, the words only');
    rerender(<Asker step={4} />);
    expect(told()).toBe('asked 0, from the top');
    press('ask');
    expect(told()).toBe('asked 1, the words only');
  });

  it('starts the step over, showing and all, when it comes before the showing is over', () => {
    render(<Asker step={1} />);
    press('ask before it is over');
    // Counted, so that the script plays again; but not as a second telling.
    expect(told()).toBe('asked 1, from the top');
    press('ask before it is over');
    expect(told()).toBe('asked 2, from the top');
    // Seen through at last, and asked again: now it is only the words.
    press('ask');
    expect(told()).toBe('asked 3, the words only');
  });

  it('does not take the event of a tap for "not yet"', () => {
    render(<Asker step={1} />);
    press('ask with the tap');
    expect(told()).toBe('asked 1, the words only');
  });
});
