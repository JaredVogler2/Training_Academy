import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { sayLineIfQuiet } from '@/audio';

/**
 * Help with the screen, as distinct from help with the question.
 *
 * A child who taps the picture that is being asked about, or the words under it, or a card that is still being
 * shown, has not got the answer wrong: they do not know what to press. Three such taps in a row, with nothing
 * pressed in between, and the lesson shows what can be pressed now and says so. It gives nothing away: every
 * thing that can be answered with is shown alike, never the right one; and it is not a hint, costs nothing, and
 * is not written into what the child has shown. It never talks over the game: if a line is being said, the nudge
 * is shown and its own line is left unsaid. And it does not nag: each of its lines is said once for a step,
 * however many times the taps bring the ring back.
 *
 * The same is done for a child who has put everything in its place and then waits: after a while the tick is
 * shown.
 */

/** What is pointed out: everything there is to answer with, or the one button that goes on from here. */
export type Nudge = 'answers' | 'done' | 'next' | 'my-turn' | 'wait';

/** Where a tap landed. */
export type Tap =
  /** On something that can be pressed now. */
  | 'pressed'
  /** On something that can be pressed, but not yet: it is being shown, or is waiting its turn. */
  | 'waiting'
  /** On nothing that can be pressed at all. */
  | 'missed';

/** So many taps in a row that pressed nothing, */
export const MISSES = 3;
/** within so long, */
export const WITHIN_MS = 8000;
/** and the nudge stays for this long. */
export const SHOWN_MS = 5000;
/** How long everything can stand in its place, with the tick untouched, before the tick is pointed out. */
export const DONE_WAIT_MS = 8000;

const CONTROL = 'button, a[href], [role="button"]';
const ANSWERS = '[data-choice], [data-card], [data-place], [data-note]';

/** What a tap was, from where it landed. */
export function classifyTap(target: Element | null, root: Element): Tap {
  const control = target?.closest(CONTROL) ?? null;
  if (!control || !root.contains(control)) return 'missed';
  const waiting =
    control.getAttribute('aria-disabled') === 'true' ||
    control.hasAttribute('disabled') ||
    control.closest('[inert]') !== null;
  return waiting ? 'waiting' : 'pressed';
}

/** What the lesson is doing at the moment of a tap, as far as a nudge needs to know. */
export interface Standing {
  /** Glim is showing, and "My turn" is the way on. */
  demo: boolean;
  /** The step has been answered, and "Next" is the way on. */
  answered: boolean;
  /** Everything is in its place and the tick is waiting to be pressed. */
  doneReady: boolean;
  /** Something there is to answer with can be pressed now. */
  anyOpen: boolean;
}

/** Read off the page what the lesson is doing. */
export function standingOf(root: Element, stage: string | undefined, answered: boolean): Standing {
  const open = [...root.querySelectorAll(ANSWERS)].some(
    (answer) =>
      answer.getAttribute('aria-disabled') !== 'true' &&
      !answer.hasAttribute('disabled') &&
      answer.closest('[inert]') === null,
  );
  return {
    demo: stage === 'demo',
    answered,
    doneReady: root.querySelector('[data-ready="true"]') !== null,
    anyOpen: open,
  };
}

/** The nudge that fits: the way on if there is one, otherwise what there is to answer with. */
export function nudgeFor(standing: Standing): Nudge {
  if (standing.demo) return 'my-turn';
  if (standing.answered) return 'next';
  if (standing.doneReady) return 'done';
  // Nothing can be pressed yet: something is being shown or said first.
  return standing.anyOpen ? 'answers' : 'wait';
}

/** The line that goes with each. */
export const NUDGE_LINES: Readonly<Record<Nudge, string>> = {
  answers: 'help.answers',
  done: 'help.done',
  next: 'help.next',
  'my-turn': 'help.my-turn',
  wait: 'help.wait',
};

/**
 * Keeps count of taps that pressed nothing, by time. `add` says whether this one makes enough of them; a tap
 * that pressed something starts the count again.
 */
export class Misses {
  private at: number[] = [];

  add(now: number): boolean {
    this.at = [...this.at.filter((earlier) => now - earlier <= WITHIN_MS), now];
    if (this.at.length < MISSES) return false;
    this.at = [];
    return true;
  }

  clear(): void {
    this.at = [];
  }
}

/**
 * Watch the taps on a lesson and say when a nudge is called for. `step` is the step on the screen (a new one
 * starts afresh); nothing is watched while `active` is false (paused, finished, waiting for sound).
 */
export function useNudge(
  step: string,
  stage: string | undefined,
  answered: boolean,
  active: boolean,
): {
  nudge: Nudge | null;
  /** For the lesson's own element, in the capture phase: every tap passes through here first. */
  onPointerDownCapture: (event: PointerEvent<HTMLElement>) => void;
} {
  const [shown, setShown] = useState<{ step: string; nudge: Nudge; turn: number } | null>(null);
  const misses = useRef(new Misses());
  const root = useRef<HTMLElement | null>(null);
  const turn = useRef(0);
  // The tick has been pointed out for this step: once is enough.
  const toldDone = useRef('');
  // What has been said aloud in this step. The ring comes back each time the taps do; the words are said once.
  const told = useRef({ step: '', nudges: new Set<Nudge>() });

  const show = useCallback(
    (nudge: Nudge) => {
      turn.current += 1;
      setShown({ step, nudge, turn: turn.current });
      if (told.current.step !== step) told.current = { step, nudges: new Set() };
      // Only what was said counts as said: a line kept back because Glim was talking is owed the next time.
      if (!told.current.nudges.has(nudge) && sayLineIfQuiet(NUDGE_LINES[nudge])) {
        told.current.nudges.add(nudge);
      }
    },
    [step],
  );

  // A new step: whatever was being pointed out belonged to the last one.
  useEffect(() => {
    misses.current.clear();
  }, [step]);

  // A nudge does not stay.
  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setShown(null), SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [shown]);

  // Everything in its place, and the tick untouched: after a while it is pointed out, once.
  useEffect(() => {
    if (!active || answered || stage === 'demo') return;
    let since: number | null = null;
    const timer = window.setInterval(() => {
      const ready = root.current?.querySelector('[data-ready="true"]') ?? null;
      if (!ready) {
        since = null;
        return;
      }
      since ??= performance.now();
      if (performance.now() - since >= DONE_WAIT_MS && toldDone.current !== step) {
        toldDone.current = step;
        show('done');
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, answered, stage, step, show]);

  const onPointerDownCapture = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      root.current = event.currentTarget;
      if (!active) return;
      const tap = classifyTap(event.target instanceof Element ? event.target : null, root.current);
      if (tap === 'pressed') {
        misses.current.clear();
        setShown(null);
        return;
      }
      if (!misses.current.add(performance.now())) return;
      show(nudgeFor(standingOf(root.current, stage, answered)));
    },
    [active, stage, answered, show],
  );

  return {
    nudge: shown !== null && shown.step === step ? shown.nudge : null,
    onPointerDownCapture,
  };
}
