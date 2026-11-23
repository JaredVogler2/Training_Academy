import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { playCue, voice } from '@/audio';
import { packText } from '@/content';
import type { ContentPack } from '@/engine';
import type { LessonRunner, RunnerState } from '@/game/lessonRunner';
import type { WorldModule } from '@/game/worlds/modules';
import { Guide, type GuideState } from '@/ui/Guide';
import { ActionButton } from '@/ui/controls';
import { IconCheck, IconNext, IconSayAgain } from '@/ui/icons';
import type { ScriptEvent, Seconds } from './script';
import { lessonText } from './text';
import styles from './Lesson.module.css';

/**
 * What every board in the lesson frame shares: what a board is given, the foot of the screen (Glim, what Glim is
 * saying, the way on), and the small decisions that are the same whatever the game is.
 */

export type Playing = Extract<RunnerState, { phase: 'playing' }>;

/** What a board is given. It draws what the engine says and reports what the child does; it decides nothing. */
export interface BoardProps {
  state: Playing;
  runner: LessonRunner;
  pack: ContentPack;
  module: WorldModule;
  paused: boolean;
  /** Nothing should move: the person has asked for less motion. */
  calm: boolean;
}

/** Where Glim, at the foot of the screen, points: up and a little left to what is asked, up and right to the answers. */
export const AIM_AT_PROMPT = 112;
export const AIM_AT_ANSWERS = 62;

/** How long the guide wonders along with the child before settling down to wait. */
const PONDER_MS = 3200;

/** What has just happened, as the scripts name it. */
export function eventOf(state: Playing): ScriptEvent {
  if (state.feedback) return state.feedback.outcome;
  return state.hint ? `hint-${state.hint.type}` : 'new';
}

/** The lines that go with this moment, by key, for a script to say. */
export function linesOf(state: Playing): {
  instruction: string;
  feedback: string | null;
  hint: string | null;
  ask: string | null;
  correct: string;
} {
  const { challenge } = state.view;
  return {
    instruction: challenge.prompt.instruction,
    feedback: state.feedback?.caption ?? null,
    hint: state.hint?.caption ?? null,
    ask: challenge.kind === 'choose-one' ? (challenge.prompt.ask ?? null) : null,
    correct: challenge.feedback.correct,
  };
}

/** How long each line takes to say just now: nothing, where it will not be heard. */
export function useSeconds(): Seconds {
  return voice().seconds;
}

/**
 * Have the lines this step may need on hand before they are wanted: its own, and any more its world says it
 * tells with (the lines of a story's pictures).
 */
export function usePreparedLines(state: Playing, module?: WorldModule): void {
  const { challenge } = state.view;
  useEffect(() => {
    voice().prepare([
      challenge.prompt.instruction,
      challenge.feedback.correct,
      challenge.feedback.incorrect,
      ...challenge.hints.map((hint) => hint.caption),
      ...(challenge.kind === 'choose-one' && challenge.prompt.ask ? [challenge.prompt.ask] : []),
      ...(module?.linesFor?.(challenge) ?? []),
    ]);
  }, [challenge, module]);
}

/**
 * State that belongs to one step and starts afresh with the next: what has been put where so far. (The board itself
 * stays on the screen from step to step, so that Glim does not blink out and in again between them.)
 */
export function useStepState<T>(
  step: number,
  initial: T,
): [T, (next: T | ((previous: T) => T)) => void] {
  const [held, setHeld] = useState({ step, value: initial });
  const value = held.step === step ? held.value : initial;
  return [
    value,
    (next) =>
      setHeld((previous) => {
        const before = previous.step === step ? previous.value : initial;
        return {
          step,
          value: typeof next === 'function' ? (next as (previous: T) => T)(before) : next,
        };
      }),
  ];
}

/** How many times the child has asked to be shown again. Asking is free: it is not help, and nothing records it. */
export function useAgain(): [number, () => void] {
  const [asked, setAsked] = useState(0);
  return [
    asked,
    () => {
      playCue('tap');
      setAsked((times) => times + 1);
    },
  ];
}

/**
 * What the guide is doing, from what the lesson is doing. The guide never knows more than the engine has said:
 * it points at whatever is being shown, wonders when a question is new, is glad of a right answer, and after a
 * wrong one tilts its head and waits — never anything that looks like disappointment.
 */
export function useGuide(
  state: Playing,
  /** Where the board is drawing attention just now, if anywhere. */
  pointing: 'prompt' | 'answers' | null,
): { mood: GuideState; aim: number } {
  const { view, feedback, hint } = state;
  const question = `${view.key}-${String(view.hintsUsed)}`;
  const [pondered, setPondered] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setPondered(question), PONDER_MS);
    return () => window.clearTimeout(timer);
  }, [question]);

  if (feedback?.outcome === 'correct') return { mood: 'celebrate', aim: 90 };
  if (pointing !== null) {
    return { mood: 'point', aim: pointing === 'prompt' ? AIM_AT_PROMPT : AIM_AT_ANSWERS };
  }
  if (feedback?.outcome === 'incorrect') return { mood: 'retry', aim: 90 };
  if (hint !== null || view.stage === 'demo') return { mood: 'point', aim: AIM_AT_ANSWERS };
  return { mood: pondered === question ? 'idle' : 'think', aim: 90 };
}

/** What the grown-up reads (and a screen reader announces): the question, then whatever just happened. */
export function captionFor(state: Playing, pack: ContentPack): string {
  const { view, feedback, hint } = state;
  const text = (key: string) => packText(pack, key);
  if (feedback) return text(feedback.caption);
  if (hint) return text(hint.caption);
  const { prompt } = view.challenge;
  // Where something is looked at and then asked about, both are there to read: "Look carefully. Which was there?"
  const { challenge } = view;
  const put =
    'ask' in prompt && prompt.ask
      ? prompt.ask
      : challenge.kind === 'make' && challenge.task.type === 'select'
        ? challenge.task.ask
        : undefined;
  const asked = put ? ` ${text(put)}` : '';
  const instruction = `${text(prompt.instruction)}${asked}`;
  return view.stage === 'demo' ? `${lessonText.watch} ${instruction}` : instruction;
}

/**
 * The foot of the screen: Glim, who is also the "show me again" button; what Glim is saying; and the way on —
 * "my turn" after a demonstration, "next" after a right answer, or, while a thing is being made, "done".
 */
export function Foot({
  state,
  runner,
  pack,
  paused,
  mood,
  aim,
  after,
  onAgain,
  done,
  caption,
  children,
}: {
  state: Playing;
  runner: LessonRunner;
  pack: ContentPack;
  paused: boolean;
  mood: GuideState;
  aim: number;
  /** Milliseconds until the showing is over and the way on should arrive. */
  after: number;
  onAgain: () => void;
  /** While a thing is being made: how the child says it is finished. Left out where an answer is a single tap. */
  done?: { ready: boolean; submit: () => void } | undefined;
  /**
   * What is being said just now, where it is not the question or what followed an answer: the line of the
   * picture a story has got to. Left out, the foot says what the lesson says.
   */
  caption?: string | undefined;
  children?: ReactNode;
}) {
  const { view, feedback, answered } = state;
  const demo = view.stage === 'demo';
  return (
    <div className={styles.foot} inert={paused}>
      {/* Glim is the "show me again" button: tapping the one who showed it is how a child asks. */}
      <button
        type="button"
        className={styles.again}
        aria-label={lessonText.sayAgain}
        data-tip={lessonText.sayAgain}
        data-tip-side="top"
        data-tip-align="start"
        onClick={onAgain}
      >
        <Guide state={mood} aim={aim} className={styles.guide} />
        <span className={styles.againBadge} aria-hidden="true">
          <IconSayAgain size={22} />
        </span>
      </button>
      <p className={styles.caption} role="status" aria-live="polite" data-tone={feedback?.outcome}>
        {caption ?? captionFor(state, pack)}
      </p>
      {children}
      {demo || answered ? (
        <ActionButton
          key={view.key}
          tone="sun"
          big
          className={demo ? styles.myTurn : styles.next}
          // The way on arrives when the showing is over; it is there, and works, from the start.
          style={{ '--after': `${String(after)}ms` } as CSSProperties}
          icon={<IconNext size={32} />}
          onClick={() => {
            playCue('step');
            void runner.next();
          }}
        >
          {demo ? lessonText.myTurn : lessonText.next}
        </ActionButton>
      ) : (
        done && (
          <ActionButton
            tone="sun"
            big
            className={styles.done}
            icon={<IconCheck size={32} />}
            disabled={!done.ready}
            data-ready={done.ready}
            onClick={() => {
              playCue('step');
              done.submit();
            }}
          >
            {lessonText.done}
          </ActionButton>
        )
      )}
    </div>
  );
}
