import { useMemo } from 'react';
import type { Choice } from '@/engine';
import {
  eventOf,
  linesOf,
  useAgain,
  useGuide,
  usePreparedLines,
  useSeconds,
  type BoardProps,
} from '../frame';
import { pointingScript, type ChooseSituation } from '../script';
import { useScript } from '../useScript';

/** How one choice stands at this moment, and so how it is drawn. */
export interface ChoiceStanding {
  /** It is the right one, and the lesson has got as far as showing so. */
  isAnswer: boolean;
  /** It was just tried, and was not right. */
  isTried: boolean;
  /** It was just tried and is still being looked at; after that it is set aside. */
  held: boolean;
  look: 'same' | 'open' | 'tried' | 'away';
  /** A tap on it does nothing just now. */
  waiting: boolean;
}

/**
 * Everything a question with choices needs worked out, whatever its board looks like: which script to play and
 * where it has got to, which choice (if any) the engine is showing as right, what has been tried, where Glim
 * points. A board draws from this and decides nothing more.
 */
export function useChoosing({ state, module, paused, calm }: BoardProps) {
  const { view, feedback, answered, picked } = state;
  const { challenge } = view;
  if (challenge.kind !== 'choose-one') {
    throw new Error('A board for questions with choices was given a thing to make.');
  }
  const demo = view.stage === 'demo';
  const glance = challenge.prompt.glance === true;
  const [asked, again] = useAgain();
  const seconds = useSeconds();
  usePreparedLines(state, module);

  // The right choice, only where the engine is showing it: a demonstration, a reveal, or an answer already given.
  const shown = view.shownAnswer ?? (answered ? picked : null);
  const tried = feedback?.outcome === 'incorrect' ? picked : null;
  const revealed = !demo && view.shownAnswer !== null;
  const event = eventOf(state);

  const situation = useMemo((): ChooseSituation => {
    const find = (id: string | null) => {
      const found = view.choices.find(({ choice }) => choice.id === id)?.choice;
      return found ? { id: found.id, stimulus: found.stimulus } : null;
    };
    return {
      stage: view.stage,
      event,
      prompt: challenge.prompt.stimulus,
      glance,
      again: asked > 0,
      choices: view.choices
        .filter(({ available }) => available)
        .map(({ choice }) => ({ id: choice.id, stimulus: choice.stimulus })),
      answer: find(shown),
      tried: find(tried),
      revealed,
      lines: linesOf(state),
      seconds,
    };
    // `state` changes with every tap; the script depends only on what is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.key, view.hintsUsed, event, shown, tried, revealed, asked, seconds]);
  const script = useMemo(
    () => (module.chooseScript ?? pointingScript)(situation),
    [module, situation],
  );
  const run = `${view.key}/${String(view.hintsUsed)}/${event}/${String(asked)}`;
  const { beat, turn } = useScript(script, run, !paused, calm, glance);

  /** Whether the script is, at this moment, counting the picture in this place. */
  const counting = (role: 'prompt' | 'answer' | 'tried', id?: string) =>
    beat.show === 'count' && (beat.group === role || (id !== undefined && beat.group === id));
  const named = (which: string) => beat.show === 'name' && beat.which === which;

  const pointing =
    beat.show === 'count'
      ? beat.group === 'prompt'
        ? 'prompt'
        : 'answers'
      : beat.show === 'name'
        ? beat.which === 'prompt'
          ? 'prompt'
          : 'answers'
        : beat.show === 'ask'
          ? 'answers'
          : beat.show === 'glance'
            ? 'prompt'
            : null;
  const { mood, aim } = useGuide(state, pointing);

  // What was asked about and its answer are lit together when the script says so (at once, where nothing moves).
  const same = beat.show === 'same';
  // In a demonstration the answer is not pointed out until the showing gets to it. (Where nothing moves, it is
  // simply shown.)
  const reached =
    !demo ||
    calm ||
    same ||
    (beat.show === 'count' && beat.group === 'answer') ||
    (beat.show === 'name' && beat.which === shown) ||
    asked > 0;
  // After a wrong answer the choice that was tried stays where it is until the script has dealt with it; only
  // then is it set aside. (Where nothing moves, it is set aside at once.)
  const comparing = !calm && (turn === 0 || (beat.show === 'count' && beat.group !== 'answer'));

  // A group to be taken in at a glance lies covered except while it is being looked at or counted. While it is
  // uncovered for a look, the choices are turned away: seeing how many is not the same as matching by eye.
  const covered =
    glance && !answered && (beat.show === 'rest' || beat.show === 'ask' || beat.show === 'name');
  const turnedAway = glance && beat.show === 'glance';

  const standingOf = (choice: Choice, available: boolean): ChoiceStanding => {
    const isAnswer = shown === choice.id && reached;
    const isTried = tried === choice.id;
    const held = isTried && comparing;
    return {
      isAnswer,
      isTried,
      held,
      look: isAnswer ? 'same' : available ? 'open' : held ? 'tried' : 'away',
      waiting: !available || answered || demo || turnedAway,
    };
  };

  return {
    challenge,
    view,
    demo,
    answered,
    glance,
    again,
    shown,
    script,
    beat,
    turn,
    counting,
    named,
    mood,
    aim,
    same,
    covered,
    turnedAway,
    standingOf,
  };
}
