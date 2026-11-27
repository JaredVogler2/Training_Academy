// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Attempt, Profile } from '@/engine';
import { History } from '@/parent/History';
import { DAY_MS, T0, attempt } from '../helpers/content';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A player's learning history, in the grown-ups' area: from the record, a day to a card, the latest first. It is
 * a statement about a child, so it says nothing until the record has been read.
 */

afterEach(cleanup);

const robin = { id: 'robin', name: 'Robin' } as Profile;
const card = () => screen.getByTestId('learning-history');
const days = () => [...card().querySelectorAll<HTMLElement>('li[data-day]')];
/** An answer on a day counted from 2 November: alone, at the first try, and right unless said otherwise. */
const on = (day: number, seq: number, overrides: Partial<Attempt> = {}): Attempt =>
  attempt({ at: T0 + day * DAY_MS + seq * 1000, seq, sessionId: `s-${String(day)}`, ...overrides });
const read = (value: Attempt[]) => ({ state: 'here', value }) as const;

describe('a learning history', () => {
  it('says nothing of any day until the record has been read', () => {
    render(<History profile={robin} record={{ state: 'waiting' }} />);
    expect(card().dataset.settled).toBe('false');
    expect(days()).toEqual([]);
    expect(card().textContent).not.toContain('No answers recorded yet.');
  });

  it('says so when the record cannot be read, and nothing else', () => {
    render(<History profile={robin} record={{ state: 'trouble' }} />);
    expect(card().dataset.settled).toBe('true');
    expect(card().textContent).toContain('The record could not be read.');
    expect(days()).toEqual([]);
  });

  it('says so, once the record has been read, when nothing has been answered', () => {
    render(<History profile={robin} record={read([])} />);
    expect(card().dataset.settled).toBe('true');
    expect(card().textContent).toContain('No answers recorded yet.');
  });

  it('has a card for each day, the latest first, with what was done alone kept apart from help', () => {
    render(
      <History
        profile={robin}
        record={read([
          on(0, 0, { outcome: 'incorrect', response: 'a' }),
          on(0, 1, { tryIndex: 1 }),
          on(3, 0),
          on(3, 1),
        ])}
      />,
    );
    const [latest, first] = days();
    expect(days().map((each) => each.dataset.day)).toEqual(['2026-11-05', '2026-11-02']);
    expect(latest?.querySelector('h3')?.textContent).toBe('5 November 2026');
    expect(latest?.textContent).toContain('1 activity practised and 2 answers recorded.');
    expect(latest?.textContent).toContain(
      '2 of 2 first tries were right without help in independent steps.',
    );
    expect(latest?.textContent).toContain('First right answer without help for 1 skill.');
    expect(first?.textContent).toContain(
      '0 of 1 first try was right without help in independent steps.',
    );
    expect(first?.textContent).toContain('1 right answer came with practice, a retry, or help.');
  });

  it('says plainly of a day of practice only that nothing was tried alone', () => {
    render(<History profile={robin} record={read([on(0, 0, { stage: 'guided' })])} />);
    expect(days()[0]?.textContent).toContain(
      'No first tries in independent steps: practice and help only.',
    );
    expect(days()[0]?.textContent).not.toContain('0 of 0');
  });

  it('shows the latest fourteen days, and says how many more there are', () => {
    const record = Array.from({ length: 16 }, (_, day) => on(day, 0));
    render(<History profile={robin} record={read(record)} />);
    expect(days()).toHaveLength(14);
    expect(days()[0]?.dataset.day).toBe('2026-11-17');
    expect(card().textContent).toContain(
      '2 earlier days are not shown here. A saved copy holds every day.',
    );
  });
});
