// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { ChunkLoadError } from '@/app/chunks';
import { getDiagnostics, resetDiagnosticsForTest } from '@/app/diagnostics';
import { HoldButton, HoldToggle, ToggleButton } from '@/ui/controls';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function Bomb({ armed, error }: { armed: boolean; error?: Error }) {
  if (armed) throw error ?? new Error('kaboom');
  return <p>all is well</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    resetDiagnosticsForTest();
    // React reports caught render errors on the console; that is expected here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  const fallback = (error: Error, retry: () => void) => (
    <div role="alert">
      <p>{error.message}</p>
      <button onClick={retry}>try again</button>
    </div>
  );

  it('shows its fallback instead of a blank page, and notes the error on the device', () => {
    render(
      <ErrorBoundary fallback={fallback}>
        <Bomb armed />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert').textContent).toContain('kaboom');
    expect(getDiagnostics().errors).toMatchObject([{ source: 'render', message: 'Error: kaboom' }]);
  });

  it('lets the person try again', () => {
    function Harness() {
      const [armed, setArmed] = useState(true);
      return (
        <ErrorBoundary
          fallback={(error, retry) => (
            <button
              onClick={() => {
                setArmed(false);
                retry();
              }}
            >
              {error.message}: try again
            </button>
          )}
        >
          <Bomb armed={armed} />
        </ErrorBoundary>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('all is well')).toBeTruthy();
  });

  it('clears itself when the page changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/world/a" fallback={fallback}>
        <Bomb armed />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    rerender(
      <ErrorBoundary resetKey="/world/b" fallback={fallback}>
        <Bomb armed={false} />
      </ErrorBoundary>,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('all is well')).toBeTruthy();
  });

  it('does not count a failed download twice (loadChunk already recorded it)', () => {
    render(
      <ErrorBoundary fallback={fallback}>
        <Bomb armed error={new ChunkLoadError('world', new Error('offline'))} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert').textContent).toContain('Could not load "world"');
    expect(getDiagnostics().errors).toEqual([]);
  });
});

describe('HoldButton', () => {
  beforeEach(() => vi.useFakeTimers());

  const setup = () => {
    const onComplete = vi.fn();
    render(<HoldButton onComplete={onComplete}>Press and hold</HoldButton>);
    return { onComplete, button: screen.getByRole('button', { name: 'Press and hold' }) };
  };
  const wait = (ms: number): void => {
    // A synchronous callback: `act` has finished by the time it returns.
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };

  it('does nothing on a tap', () => {
    const { onComplete, button } = setup();
    fireEvent.pointerDown(button, { button: 0 });
    wait(300);
    fireEvent.pointerUp(button);
    wait(5000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('acts after being held for the full two seconds', () => {
    const { onComplete, button } = setup();
    fireEvent.pointerDown(button, { button: 0 });
    wait(1900);
    expect(onComplete).not.toHaveBeenCalled();
    wait(200);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('starts over if the finger slides off', () => {
    const { onComplete, button } = setup();
    fireEvent.pointerDown(button, { button: 0 });
    wait(1500);
    fireEvent.pointerLeave(button);
    fireEvent.pointerDown(button, { button: 0 });
    wait(1500);
    expect(onComplete).not.toHaveBeenCalled();
    wait(600);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('can be held with the keyboard, and key repeat does not restart it', () => {
    const { onComplete, button } = setup();
    fireEvent.keyDown(button, { key: ' ' });
    wait(1000);
    fireEvent.keyDown(button, { key: ' ', repeat: true });
    wait(1100);
    expect(onComplete).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(button, { key: 'Enter' });
    wait(500);
    fireEvent.keyUp(button, { key: 'Enter' });
    wait(3000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('ignores the right mouse button and losing focus cancels', () => {
    const { onComplete, button } = setup();
    fireEvent.pointerDown(button, { button: 2 });
    wait(3000);
    fireEvent.pointerDown(button, { button: 0 });
    wait(1000);
    fireEvent.blur(button);
    wait(3000);
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('HoldToggle: a switch that is a grown-up’s to set, on a screen a child is tapping', () => {
  beforeEach(() => vi.useFakeTimers());

  const setup = (pressed: boolean) => {
    const onChange = vi.fn();
    render(
      <HoldToggle
        pressed={pressed}
        onChange={onChange}
        label="A grown-up is helping"
        stateText={pressed ? 'On. Hold to switch off.' : 'Off. Hold to switch on.'}
        icon={<svg />}
      />,
    );
    return { onChange, button: screen.getByRole('button', { name: 'A grown-up is helping' }) };
  };
  const wait = (ms: number): void => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };

  it('does nothing on a tap, a click, or a hold that is let go early', () => {
    const { onChange, button } = setup(false);
    fireEvent.click(button);
    fireEvent.pointerDown(button, { button: 0 });
    wait(200);
    fireEvent.pointerUp(button);
    fireEvent.pointerDown(button, { button: 0 });
    wait(1000);
    fireEvent.pointerUp(button);
    wait(5000);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('switches on after being held', () => {
    const { onChange, button } = setup(false);
    fireEvent.pointerDown(button, { button: 0 });
    wait(1100);
    expect(onChange).not.toHaveBeenCalled();
    expect(button.getAttribute('data-holding')).toBe('true');
    wait(200);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(button.getAttribute('data-holding')).toBeNull();
  });

  it('is held to switch off, too: a small finger does not undo what a grown-up set', () => {
    const { onChange, button } = setup(true);
    fireEvent.click(button);
    fireEvent.pointerDown(button, { button: 0 });
    wait(300);
    fireEvent.pointerLeave(button);
    wait(3000);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerDown(button, { button: 0 });
    wait(1300);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('says what it is and how it stands, and can be held with the keyboard', () => {
    const { onChange, button } = setup(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('data-tip')).toBe('On. Hold to switch off.');
    fireEvent.keyDown(button, { key: 'Enter' });
    wait(1300);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(false);
  });
});

describe('ToggleButton', () => {
  it('is a real button that reports its state to assistive technology', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ToggleButton
        pressed={false}
        onChange={onChange}
        label="Sound"
        stateText="Sound is off"
        icon={<i />}
      />,
    );
    const button = screen.getByRole('button', { name: 'Sound' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    // The state in words is the tooltip (for a mouse or a keyboard; see base.css).
    expect(button.getAttribute('data-tip')).toBe('Sound is off');
    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(
      <ToggleButton
        pressed
        onChange={onChange}
        label="Sound"
        stateText="Sound is on"
        icon={<i />}
      />,
    );
    expect(button.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(button);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});
