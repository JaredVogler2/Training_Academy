// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PauseSheet } from '@/game/lesson/PauseSheet';
import { Modal } from '@/ui/controls';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/**
 * The dialog every form and warning in the grown-ups' area is shown in.
 *
 * A browser's <dialog> says "closed" a moment after it closes. A grown-up who presses "Cancel" and at once the
 * button that opens the dialog again has it open by the time that word arrives; taken at its word, the dialog
 * shut in their face. It happened once in CI, on the slowest of its machines, and was a minute of nothing.
 */
function dialogOf(container: HTMLElement): HTMLDialogElement {
  const dialog = container.querySelector('dialog');
  if (!dialog) throw new Error('No dialog was drawn.');
  // The test page's <dialog> is not asked to do what a browser's does: these stand in for it.
  dialog.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  dialog.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  return dialog;
}

const draw = (open: boolean, onClose: () => void) => (
  <Modal open={open} onClose={onClose} title="Add a player" actions={<button>Add</button>}>
    <p>A nickname is all that is asked for.</p>
  </Modal>
);

describe('a modal dialog', () => {
  it('shows what it is given only while it is open', () => {
    const { container, rerender, queryByText } = render(draw(false, () => {}));
    dialogOf(container);
    expect(queryByText('A nickname is all that is asked for.')).toBeNull();
    rerender(draw(true, () => {}));
    expect(queryByText('A nickname is all that is asked for.')).not.toBeNull();
  });

  it('asks to be closed when the browser closes it: Escape, or the page behind it', () => {
    const onClose = vi.fn();
    const { container, rerender } = render(draw(false, onClose));
    const dialog = dialogOf(container);
    rerender(draw(true, onClose));
    expect(dialog.open).toBe(true);
    // Escape: the browser says "cancel", closes the dialog, and then says "close".
    fireEvent(dialog, new Event('cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    dialog.close();
    fireEvent(dialog, new Event('close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not take a late "closed" from before it was opened again as a wish to close it now', () => {
    const onClose = vi.fn();
    const { container, rerender } = render(draw(false, onClose));
    const dialog = dialogOf(container);
    rerender(draw(true, onClose));
    // Cancelled, and at once asked for again…
    rerender(draw(false, onClose));
    expect(dialog.open).toBe(false);
    rerender(draw(true, onClose));
    expect(dialog.open).toBe(true);
    // …and only now does the browser say that the first one closed.
    fireEvent(dialog, new Event('close'));
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog.open).toBe(true);
  });
});

describe('the pause sheet', () => {
  it('carries on when the browser closes it, and not for a late "closed" from the pause before', () => {
    const onResume = vi.fn();
    const { container, rerender } = render(
      <PauseSheet open={false} onResume={onResume} helping={false} onHelping={() => undefined} />,
    );
    const dialog = dialogOf(container);
    rerender(<PauseSheet open onResume={onResume} helping={false} onHelping={() => undefined} />);
    expect(dialog.open).toBe(true);
    // Carried on, and at once paused again…
    rerender(
      <PauseSheet open={false} onResume={onResume} helping={false} onHelping={() => undefined} />,
    );
    rerender(<PauseSheet open onResume={onResume} helping={false} onHelping={() => undefined} />);
    expect(dialog.open).toBe(true);
    // …before the browser has said that the first pause ended.
    fireEvent(dialog, new Event('close'));
    expect(onResume).not.toHaveBeenCalled();
    // Escape, and the browser closing it, still carry on.
    fireEvent(dialog, new Event('cancel'));
    expect(onResume).toHaveBeenCalledTimes(1);
    dialog.close();
    fireEvent(dialog, new Event('close'));
    expect(onResume).toHaveBeenCalledTimes(2);
  });

  it('has the switch a grown-up holds down to say they are helping, and a tap does nothing to it', () => {
    vi.useFakeTimers();
    const onHelping = vi.fn();
    const { container, getByRole, queryByText, rerender } = render(
      <PauseSheet open={false} onResume={() => undefined} helping={false} onHelping={onHelping} />,
    );
    dialogOf(container);
    rerender(<PauseSheet open onResume={() => undefined} helping={false} onHelping={onHelping} />);
    const helping = getByRole('button', { name: 'A grown-up is helping' });
    expect(helping.getAttribute('aria-pressed')).toBe('false');
    expect(queryByText(/not counted as done alone/)).toBeNull();

    fireEvent.click(helping);
    fireEvent.pointerDown(helping, { button: 0 });
    fireEvent.pointerUp(helping);
    expect(onHelping).not.toHaveBeenCalled();

    fireEvent.pointerDown(helping, { button: 0 });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onHelping).toHaveBeenCalledExactlyOnceWith(true);

    // On, it is pressed in, and the sheet says in words what that means.
    rerender(<PauseSheet open onResume={() => undefined} helping onHelping={onHelping} />);
    expect(helping.getAttribute('aria-pressed')).toBe('true');
    expect(queryByText(/not counted as done alone/)).not.toBeNull();
  });
});
