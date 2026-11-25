// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DONE_WAIT_MS,
  MISSES,
  Misses,
  NUDGE_LINES,
  SHOWN_MS,
  WITHIN_MS,
  classifyTap,
  nudgeFor,
  standingOf,
  useNudge,
  type Nudge,
} from '@/game/lesson/useNudge';
import { lessonText } from '@/game/lesson/text';
import lines from '@/voice/lines.json';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Help with the screen, as distinct from help with the question: taps that land on nothing are answered by
 * showing what can be pressed. It gives no answer away and writes nothing down.
 */

const said = vi.hoisted(() => ({ quiet: [] as string[], talking: false }));
vi.mock('@/audio', () => ({
  // As the game's does: says the line and answers yes, unless something else is being said.
  sayLineIfQuiet: (key: string) => {
    if (said.talking) return false;
    said.quiet.push(key);
    return true;
  },
}));

const recorded: Record<string, string> = lines.groups.common.lines;

/** A page with the things a lesson has on it. */
function page(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.append(root);
  return root;
}
const find = (root: HTMLElement, selector: string): Element => {
  const found = root.querySelector(selector);
  if (!found) throw new Error(`Nothing matches ${selector}.`);
  return found;
};

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  said.quiet = [];
  said.talking = false;
  vi.useRealTimers();
});

describe('where a tap landed', () => {
  const root = () =>
    page(`
      <div class="prompt"><svg><circle id="snail"></circle></svg></div>
      <button data-choice="a"><svg><path id="leaf"></path></svg></button>
      <button data-choice="b" aria-disabled="true"><i id="shown"></i></button>
      <button id="off" disabled>Done</button>
      <a href="/" id="home">Home</a>
      <div inert><button id="behind">Hidden</button></div>
      <p id="caption">Which group has the same amount?</p>
    `);

  it('on something that can be pressed, or on the picture inside it, pressed it', () => {
    const lesson = root();
    expect(classifyTap(find(lesson, '[data-choice="a"]'), lesson)).toBe('pressed');
    expect(classifyTap(find(lesson, '#leaf'), lesson)).toBe('pressed');
    expect(classifyTap(find(lesson, '#home'), lesson)).toBe('pressed');
  });

  it('on the picture that is asked about, or the words, pressed nothing', () => {
    const lesson = root();
    expect(classifyTap(find(lesson, '#snail'), lesson)).toBe('missed');
    expect(classifyTap(find(lesson, '#caption'), lesson)).toBe('missed');
    expect(classifyTap(lesson, lesson)).toBe('missed');
    expect(classifyTap(null, lesson)).toBe('missed');
  });

  it('on something that is waiting its turn is told apart from both', () => {
    const lesson = root();
    expect(classifyTap(find(lesson, '#shown'), lesson)).toBe('waiting');
    expect(classifyTap(find(lesson, '#off'), lesson)).toBe('waiting');
    expect(classifyTap(find(lesson, '#behind'), lesson)).toBe('waiting');
  });

  it('on a button of some other page is nothing to do with this one', () => {
    const lesson = root();
    const other = page('<button id="elsewhere">Elsewhere</button>');
    expect(classifyTap(find(other, '#elsewhere'), lesson)).toBe('missed');
  });
});

describe('what the lesson is doing', () => {
  it('is read off the page: whether anything there is to answer with can be pressed', () => {
    const open = page('<button data-choice="a"></button><button data-choice="b"></button>');
    expect(standingOf(open, 'guided', false).anyOpen).toBe(true);
    const shown = page(
      '<button data-choice="a" aria-disabled="true"></button><button data-card="b" disabled></button>',
    );
    expect(standingOf(shown, 'guided', false).anyOpen).toBe(false);
    const paused = page('<div inert><button data-choice="a"></button></div>');
    expect(standingOf(paused, 'guided', false).anyOpen).toBe(false);
    // The bar's buttons are not things to answer with.
    const bar = page('<button aria-label="Pause"></button>');
    expect(standingOf(bar, 'guided', false).anyOpen).toBe(false);
  });

  it('knows cards, places and notes as well as choices', () => {
    for (const mark of ['data-choice', 'data-card', 'data-place', 'data-note']) {
      expect(standingOf(page(`<button ${mark}="x"></button>`), 'probe', false).anyOpen, mark).toBe(
        true,
      );
    }
  });

  it('knows a tick that is waiting to be pressed', () => {
    expect(standingOf(page('<button data-ready="true"></button>'), 'guided', false).doneReady).toBe(
      true,
    );
    expect(
      standingOf(page('<button data-ready="false"></button>'), 'guided', false).doneReady,
    ).toBe(false);
  });
});

describe('what is pointed out', () => {
  const standing = { demo: false, answered: false, doneReady: false, anyOpen: true };

  it('is the way on, where there is one', () => {
    expect(nudgeFor({ ...standing, demo: true })).toBe('my-turn');
    expect(nudgeFor({ ...standing, answered: true })).toBe('next');
    expect(nudgeFor({ ...standing, doneReady: true })).toBe('done');
  });

  it('is otherwise everything there is to answer with: never one of them', () => {
    expect(nudgeFor(standing)).toBe('answers');
  });

  it('is to watch, while nothing can be pressed yet', () => {
    expect(nudgeFor({ ...standing, anyOpen: false })).toBe('wait');
  });

  it('has a line for each, recorded word for word as it is written', () => {
    for (const nudge of Object.keys(NUDGE_LINES) as Nudge[]) {
      expect(recorded[NUDGE_LINES[nudge]], nudge).toBe(lessonText.nudge[nudge]);
    }
    expect(Object.keys(lessonText.nudge).sort()).toEqual(Object.keys(NUDGE_LINES).sort());
  });
});

describe('taps that pressed nothing', () => {
  it('are enough at the third, within a short while', () => {
    const misses = new Misses();
    expect(MISSES).toBe(3);
    expect(misses.add(0)).toBe(false);
    expect(misses.add(1000)).toBe(false);
    expect(misses.add(2000)).toBe(true);
  });

  it('start again after that, rather than nudging at every tap', () => {
    const misses = new Misses();
    for (const at of [0, 100, 200]) misses.add(at);
    expect(misses.add(300)).toBe(false);
    expect(misses.add(400)).toBe(false);
    expect(misses.add(500)).toBe(true);
  });

  it('do not add up over a long time: a tap now and then is only looking', () => {
    const misses = new Misses();
    expect(misses.add(0)).toBe(false);
    expect(misses.add(WITHIN_MS - 1000)).toBe(false);
    // The first is too long ago by now.
    expect(misses.add(WITHIN_MS + 1)).toBe(false);
    expect(misses.add(WITHIN_MS + 2)).toBe(true);
  });

  it('are forgotten once something is pressed', () => {
    const misses = new Misses();
    misses.add(0);
    misses.add(100);
    misses.clear();
    expect(misses.add(200)).toBe(false);
  });
});

function Lesson({
  step = 'one',
  stage = 'guided',
  answered = false,
  active = true,
  ready = false,
  open = true,
}: {
  step?: string;
  stage?: string;
  answered?: boolean;
  active?: boolean;
  ready?: boolean;
  open?: boolean;
}) {
  const { nudge, onPointerDownCapture } = useNudge(step, stage, answered, active);
  return (
    <div
      data-testid="lesson"
      data-nudge={nudge ?? undefined}
      onPointerDownCapture={onPointerDownCapture}
    >
      <div data-testid="picture">a snail</div>
      <button data-choice="a" aria-disabled={!open}>
        one
      </button>
      <button data-testid="tick" data-ready={ready}>
        done
      </button>
    </div>
  );
}

describe('a lesson that is being tapped', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const nudge = () => screen.getByTestId('lesson').getAttribute('data-nudge');
  const miss = (times = 1) => {
    for (let count = 0; count < times; count++)
      fireEvent.pointerDown(screen.getByTestId('picture'));
  };
  const wait = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };

  it('points out what there is to answer with after three taps on nothing, and says so', () => {
    render(<Lesson />);
    miss(2);
    expect(nudge()).toBeNull();
    miss();
    expect(nudge()).toBe('answers');
    expect(said.quiet).toEqual(['help.answers']);
  });

  it('says its line once for a step, however often the taps bring the ring back', () => {
    const { rerender } = render(<Lesson />);
    miss(3);
    miss(3);
    miss(3);
    expect(nudge()).toBe('answers');
    expect(said.quiet).toEqual(['help.answers']);
    // A new step is a new thing to be told about.
    rerender(<Lesson step="two" />);
    miss(3);
    expect(said.quiet).toEqual(['help.answers', 'help.answers']);
  });

  it('owes the line while Glim is talking, and says it the next time', () => {
    said.talking = true;
    render(<Lesson />);
    miss(3);
    expect(nudge()).toBe('answers');
    expect(said.quiet).toEqual([]);
    said.talking = false;
    miss(3);
    expect(said.quiet).toEqual(['help.answers']);
    miss(3);
    expect(said.quiet).toEqual(['help.answers']);
  });

  it('points out the way on instead, where there is one', () => {
    const { rerender } = render(<Lesson stage="demo" />);
    miss(3);
    expect(nudge()).toBe('my-turn');
    rerender(<Lesson step="two" answered />);
    miss(3);
    expect(nudge()).toBe('next');
    rerender(<Lesson step="three" ready />);
    miss(3);
    expect(nudge()).toBe('done');
    expect(said.quiet).toEqual(['help.my-turn', 'help.next', 'help.done']);
  });

  it('says to watch, when the taps come while something is still being shown', () => {
    render(<Lesson open={false} />);
    miss(3);
    expect(nudge()).toBe('wait');
  });

  it('counts a tap on something that is waiting its turn as a tap on nothing', () => {
    render(<Lesson open={false} />);
    for (let count = 0; count < 3; count++) {
      fireEvent.pointerDown(screen.getByRole('button', { name: 'one' }));
    }
    expect(nudge()).toBe('wait');
  });

  it('does not stay: it is gone after a few seconds', () => {
    render(<Lesson />);
    miss(3);
    wait(SHOWN_MS - 100);
    expect(nudge()).toBe('answers');
    wait(200);
    expect(nudge()).toBeNull();
  });

  it('is gone at once when something is pressed', () => {
    render(<Lesson />);
    miss(3);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'one' }));
    expect(nudge()).toBeNull();
  });

  it('counts only taps in a row: pressing something in between starts the count again', () => {
    render(<Lesson />);
    miss(2);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'one' }));
    // One more is the first of a new run, not the third of the old one.
    miss();
    expect(nudge()).toBeNull();
    miss();
    expect(nudge()).toBeNull();
    miss();
    expect(nudge()).toBe('answers');
  });

  it('does not carry taps, or what was pointed out, over to the next step', () => {
    const { rerender } = render(<Lesson />);
    miss(2);
    rerender(<Lesson step="two" />);
    miss();
    expect(nudge()).toBeNull();
    miss(2);
    expect(nudge()).toBe('answers');
    rerender(<Lesson step="three" />);
    expect(nudge()).toBeNull();
  });

  it('watches nothing while the lesson is paused or waiting for sound', () => {
    render(<Lesson active={false} />);
    miss(6);
    expect(nudge()).toBeNull();
    expect(said.quiet).toEqual([]);
  });

  it('points out the tick, once, when everything has stood in its place for a while', () => {
    render(<Lesson ready />);
    // The page is known from the first tap on it.
    fireEvent.pointerDown(screen.getByRole('button', { name: 'one' }));
    wait(DONE_WAIT_MS - 1500);
    expect(nudge()).toBeNull();
    wait(3000);
    expect(nudge()).toBe('done');
    expect(said.quiet).toEqual(['help.done']);
    wait(SHOWN_MS + 100);
    expect(nudge()).toBeNull();
    // Once is enough for a step.
    wait(DONE_WAIT_MS * 2);
    expect(nudge()).toBeNull();
    expect(said.quiet).toEqual(['help.done']);
  });

  it('does not point out a tick that is not ready, or one in a step that is answered', () => {
    const { rerender } = render(<Lesson />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'one' }));
    wait(DONE_WAIT_MS * 2);
    expect(nudge()).toBeNull();
    rerender(<Lesson step="two" ready answered />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'one' }));
    wait(DONE_WAIT_MS * 2);
    expect(nudge()).toBeNull();
  });
});
