// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Guide, type GuideState } from '@/ui/Guide';

afterEach(cleanup);

const guide = (container: HTMLElement): HTMLElement => {
  const found = container.querySelector<HTMLElement>('[data-testid="guide"]');
  if (!found) throw new Error('No guide.');
  return found;
};

describe('the guide', () => {
  it('has a pose for every state it can be asked for', () => {
    const states: GuideState[] = ['idle', 'point', 'think', 'celebrate', 'retry', 'wave'];
    for (const state of states) {
      const { container, unmount } = render(<Guide state={state} />);
      expect(guide(container).dataset.state).toBe(state);
      unmount();
    }
  });

  it('rests when nothing is asked of it', () => {
    const { container } = render(<Guide />);
    expect(guide(container).dataset.state).toBe('idle');
  });

  it('is decoration for assistive technology: the words beside it say what it shows', () => {
    const { container } = render(<Guide state="celebrate" />);
    expect(guide(container).getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('svg')?.getAttribute('focusable')).toBe('false');
  });

  it('points with the arm on the side it is pointing to', () => {
    const cases: [aim: number, side: string][] = [
      [0, 'right'],
      [45, 'right'],
      [90, 'right'],
      [135, 'left'],
      [180, 'left'],
      [-120, 'left'],
      [-30, 'right'],
    ];
    for (const [aim, side] of cases) {
      const { container, unmount } = render(<Guide state="point" aim={aim} />);
      expect(guide(container).dataset.side, String(aim)).toBe(side);
      unmount();
    }
  });

  it('turns the arm from hanging down to the aim, and sends the sparks the same way', () => {
    const { container } = render(<Guide state="point" aim={90} />);
    // Straight up is half a turn from straight down.
    expect(guide(container).style.getPropertyValue('--aim')).toBe('-180deg');
    expect(guide(container).style.getPropertyValue('--beam')).toBe('-90deg');
    cleanup();
    const right = render(<Guide state="point" aim={0} />);
    expect(guide(right.container).style.getPropertyValue('--aim')).toBe('-90deg');
    expect(guide(right.container).style.getPropertyValue('--beam')).toBe('0deg');
  });

  it('can be afloat, in a boat', () => {
    const afloat = render(<Guide afloat />);
    expect(guide(afloat.container).hasAttribute('data-afloat')).toBe(true);
    cleanup();
    const ashore = render(<Guide />);
    expect(guide(ashore.container).hasAttribute('data-afloat')).toBe(false);
  });

  it('gives each copy its own gradients, so two on one page do not share paint', () => {
    const { container } = render(
      <>
        <Guide />
        <Guide />
      </>,
    );
    const ids = [...container.querySelectorAll('radialGradient, linearGradient')].map(
      (gradient) => gradient.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(4);
  });
});
