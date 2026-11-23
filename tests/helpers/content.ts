import numberGarden from '@/content/packs/number-garden.v2.json';
import {
  advanceDemo,
  createSession,
  getHint,
  getNextChallenge,
  parseContentPack,
  solutionOf,
  submitAttempt,
  type Attempt,
  type ChallengeView,
  type ContentPack,
  type Lesson,
  type LessonSession,
} from '@/engine';

export function numberGardenPack(): ContentPack {
  const parsed = parseContentPack(numberGarden);
  if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
  return parsed.value;
}

export function sampleLesson(): Lesson {
  const lesson = numberGardenPack().lessons[0];
  if (!lesson) throw new Error('The sample pack has no lesson.');
  return lesson;
}

export const T0 = Date.UTC(2026, 10, 2, 9, 0, 0);
export const DAY_MS = 24 * 60 * 60 * 1000;
export const dayOf = (at: number): string => new Date(at).toISOString().slice(0, 10);

export function newSession(lesson: Lesson, seed = 7, id = `s-${seed}`, now = T0): LessonSession {
  return createSession(lesson, { id, profileId: 'p-1', seed, now, contentVersion: 1 });
}

/**
 * The right answer to what is being shown. Only a test may know it: the screen is told the answer by the engine
 * when, and only when, the lesson is showing it.
 */
export function answerTo(view: ChallengeView): string {
  const { challenge } = view;
  if (challenge.kind === 'choose-one') return challenge.answer;
  const { task } = challenge;
  // Pairs has no answer to give, only a number of turns: the fewest there could be.
  return solutionOf(task) ?? String(task.type === 'pairs' ? task.cards.length : 0);
}

/** An answer that is wrong, if what is being shown can be answered wrongly at all. */
export function wrongAnswerTo(view: ChallengeView): string | null {
  const { challenge } = view;
  if (challenge.kind === 'choose-one') {
    return (
      view.choices.find((c) => c.available && c.choice.id !== challenge.answer)?.choice.id ?? null
    );
  }
  const { task } = challenge;
  switch (task.type) {
    case 'give':
      return String(task.want.count === task.pile ? task.want.count - 1 : task.want.count + 1);
    case 'order':
      return [...task.solution].reverse().join('-');
    case 'echo': {
      const other = task.cards.find((card) => card.id !== task.solution[0]);
      return other ? [other.id, ...task.solution.slice(1)].join('-') : null;
    }
    case 'select': {
      const extra = task.cards.find((card) => !task.solution.includes(card.id));
      return extra ? [...task.solution, extra.id].sort().join('-') : null;
    }
    case 'pairs':
      return null;
    case 'program':
      // One command, which is never the whole of an authored journey.
      return task.solution.split('-').at(-1) === 'l' ? 'r' : 'l';
    case 'design': {
      const [first] = task.controls;
      const other = first?.options.find((option) => option !== task.solution[0]);
      return other ? [other, ...task.solution.slice(1)].join('-') : null;
    }
  }
}

/** What a simulated child does with one presentation. */
export type Move = { type: 'answer'; response: string; adultAssist?: boolean } | { type: 'hint' };
export type Player = (view: ChallengeView) => Move;

export const answerCorrectly: Player = (view) => ({ type: 'answer', response: answerTo(view) });

/** Gives a wrong answer first whenever there still is one to give. */
export const answerWrongFirst: Player = (view) => ({
  type: 'answer',
  response: (view.shownAnswer === null ? wrongAnswerTo(view) : null) ?? answerTo(view),
});

export const hintThenAnswer: Player = (view) =>
  view.hintsUsed === 0 ? { type: 'hint' } : { type: 'answer', response: answerTo(view) };

export interface Playthrough {
  session: LessonSession;
  attempts: Attempt[];
  moves: number;
}

/** Play a session to the end (or until `maxMoves`), one step of simulated time per move. */
export function play(
  lesson: Lesson,
  start: LessonSession,
  player: Player,
  options: { now?: number; maxMoves?: number } = {},
): Playthrough {
  let session = start;
  let now = options.now ?? T0;
  const attempts: Attempt[] = [];
  let moves = 0;
  const maxMoves = options.maxMoves ?? 500;
  for (;;) {
    const view = getNextChallenge(session, lesson);
    if (!view || moves >= maxMoves) break;
    moves += 1;
    now += 4000;
    if (view.stage === 'demo') {
      session = advanceDemo(session, lesson, now);
      continue;
    }
    const move = player(view);
    if (move.type === 'hint') {
      session = getHint(session, lesson, now).session;
      continue;
    }
    const result = submitAttempt(session, lesson, {
      key: view.key,
      response: move.response,
      now,
      day: dayOf(now),
      durationMs: 3000,
      ...(move.adultAssist === undefined ? {} : { adultAssist: move.adultAssist }),
    });
    if (!result.accepted) throw new Error(`Move rejected: ${result.reason}`);
    session = result.session;
    attempts.push(result.attempt);
  }
  return { session, attempts, moves };
}

/** A hand-made attempt for evidence tests. */
export function attempt(overrides: Partial<Attempt> = {}): Attempt {
  const at = overrides.at ?? T0;
  const sessionId = overrides.sessionId ?? 's-1';
  const seq = overrides.seq ?? 0;
  return {
    schemaVersion: 1,
    id: `${sessionId}:${seq}`,
    profileId: 'p-1',
    sessionId,
    seq,
    lessonId: 'ng-same-amount-01',
    lessonVersion: 1,
    contentVersion: 1,
    challengeId: 'ng-same-amount-01.two-apples',
    skillId: 'math.quantity.match-sets-to-3',
    variant: 'two-as-cluster',
    stage: 'independent',
    tryIndex: 0,
    hintLevel: 0,
    assistance: 'none',
    outcome: 'correct',
    response: 'c',
    at,
    day: dayOf(at),
    durationMs: 2500,
    ...overrides,
  };
}
