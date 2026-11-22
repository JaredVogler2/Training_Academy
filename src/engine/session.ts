import { rngFor } from './random';
import {
  MAX_DURATION_MS,
  RECORD_SCHEMA_VERSION,
  type Attempt,
  type Challenge,
  type Choice,
  type Hint,
  type Lesson,
  type LessonSession,
  type Stage,
  type Step,
} from './schema';

/**
 * Lesson progression. Every function here is pure: it takes a session and returns a new one, never touches a clock,
 * a random source, storage or the screen. The caller persists what comes back.
 *
 * The life of one lesson sitting:
 *
 *   demo steps         the guide shows a worked example; `advanceDemo` moves on; nothing is recorded
 *   guided steps       the child answers with support; attempts are recorded as guided
 *   independent steps  the child answers alone; only a first try with no hint and no adult help is independent
 *                      evidence. A challenge that needed help is followed, at the end of the lesson, by a re-probe:
 *                      a *different* challenge for the same skill, while the reserve and the lesson's limit allow.
 *
 * A wrong answer is never a dead end: the choice just tried is taken away and the child tries again. When only the
 * right choice is left it is revealed, and tapping it finishes the challenge as an assisted solve.
 */

/** A bug in the caller or in unvalidated content, never something a child can cause by tapping. */
export class EngineError extends Error {
  override name = 'EngineError';
}

export interface CreateSessionInput {
  id: string;
  profileId: string;
  /** Unsigned 32-bit seed. */
  seed: number;
  now: number;
  /** `contentVersion` of the pack the lesson came from. */
  contentVersion: number;
}

export interface ChoiceView {
  choice: Choice;
  /** False once the choice has been taken away by a wrong try or a hint. */
  available: boolean;
}

export interface ChallengeView {
  /** Identifies this presentation and this try. `submitAttempt` rejects any other key, which makes a double tap harmless. */
  key: string;
  stepIndex: number;
  stepCount: number;
  stage: Stage;
  isReprobe: boolean;
  challenge: Challenge;
  /** In the order they should be shown; the order is stable for the life of the step. */
  choices: ChoiceView[];
  tryIndex: number;
  hintsUsed: number;
  hintsAvailable: number;
  /** The right choice, when the lesson is showing it (a demonstration, or after a reveal); otherwise `null`. */
  shownAnswer: string | null;
}

export type RejectionReason =
  'completed' | 'not-answerable' | 'stale' | 'unknown-choice' | 'unavailable-choice';

export interface Feedback {
  outcome: 'correct' | 'incorrect';
  /** True only for a first-try, unhinted, unassisted correct answer in the independent stage. */
  independent: boolean;
  /** String key of the teaching message for this outcome. */
  caption: string;
  misconception: string | null;
  next: 'retry' | 'advance' | 'complete';
  /** True when the retry now shows the answer because nothing else is left. */
  revealed: boolean;
}

export interface SubmitInput {
  key: string;
  choiceId: string;
  now: number;
  /** Local calendar day of `now`, `YYYY-MM-DD`. */
  day: string;
  /** Time the child spent on this try, pauses excluded. Clamped to a sane range. */
  durationMs: number;
  /** True when a grown-up has said they are helping with this one. */
  adultAssist?: boolean;
}

export type SubmitResult =
  | { accepted: false; reason: RejectionReason; session: LessonSession }
  | { accepted: true; session: LessonSession; attempt: Attempt; feedback: Feedback };

export interface HintResult {
  session: LessonSession;
  /** `null` when there is nothing (more) to offer. */
  hint: Hint | null;
  hintsUsed: number;
  hintsAvailable: number;
}

export interface SessionSummary {
  completed: boolean;
  independentProbes: number;
  independentFirstTryCorrect: number;
  assistedSolves: number;
  /** Whether this sitting met the lesson's own bar. This is not mastery: see evidence.ts. */
  metSuccessCriteria: boolean;
}

const FRESH_PRESENTATION = { tryIndex: 0, hintLevel: 0, eliminated: [], revealed: false } as const;

function challengeOf(lesson: Lesson, challengeId: string): Challenge {
  const challenge = lesson.challenges.find((candidate) => candidate.id === challengeId);
  if (!challenge) throw new EngineError(`Lesson ${lesson.id} has no challenge ${challengeId}.`);
  return challenge;
}

function assertSameLesson(session: LessonSession, lesson: Lesson): void {
  if (session.lessonId !== lesson.id || session.lessonVersion !== lesson.version) {
    throw new EngineError(
      `Session ${session.id} belongs to ${session.lessonId} v${session.lessonVersion}, not ${lesson.id} v${lesson.version}.`,
    );
  }
}

function currentStep(session: LessonSession): Step | null {
  if (session.status === 'completed') return null;
  return session.steps[session.cursor] ?? null;
}

function presentationKey(session: LessonSession): string {
  return `${session.id}/${session.cursor}/${session.presentation.tryIndex}`;
}

/** Display order of a step's choices: seeded, and the same on every call. */
function choiceOrder(session: LessonSession, challenge: Challenge): Choice[] {
  return rngFor(session.seed, 'choices', session.cursor, challenge.id).shuffle(challenge.choices);
}

function advance(session: LessonSession, now: number): LessonSession {
  const cursor = session.cursor + 1;
  const completed = cursor >= session.steps.length;
  return {
    ...session,
    cursor,
    presentation: { ...FRESH_PRESENTATION, eliminated: [] },
    status: completed ? 'completed' : 'active',
    completedAt: completed ? now : null,
    updatedAt: now,
  };
}

/** Plan a new sitting of `lesson`. The same seed always plans the same sitting. */
export function createSession(lesson: Lesson, input: CreateSessionInput): LessonSession {
  const { pool, count } = lesson.plan.independent;
  if (count > pool.length) {
    throw new EngineError(`Lesson ${lesson.id} draws ${count} from a pool of ${pool.length}.`);
  }
  const shuffled = rngFor(input.seed, 'plan', lesson.id).shuffle(pool);
  const steps: Step[] = [
    ...lesson.plan.demo.map((challengeId): Step => ({ stage: 'demo', challengeId })),
    ...lesson.plan.guided.map((challengeId): Step => ({ stage: 'guided', challengeId })),
    ...shuffled.slice(0, count).map((challengeId): Step => ({ stage: 'independent', challengeId })),
  ];
  for (const step of steps) challengeOf(lesson, step.challengeId);

  return {
    schemaVersion: RECORD_SCHEMA_VERSION,
    id: input.id,
    profileId: input.profileId,
    lessonId: lesson.id,
    lessonVersion: lesson.version,
    contentVersion: input.contentVersion,
    seed: input.seed >>> 0,
    status: 'active',
    startedAt: input.now,
    updatedAt: input.now,
    completedAt: null,
    steps,
    reserve: shuffled.slice(count),
    cursor: 0,
    presentation: { ...FRESH_PRESENTATION, eliminated: [] },
    nextSeq: 0,
    reprobesUsed: 0,
    tally: { independentProbes: 0, independentFirstTryCorrect: 0, assistedSolves: 0 },
  };
}

/** What to show now, or `null` when the lesson is finished. Asking does not change or record anything. */
export function getNextChallenge(session: LessonSession, lesson: Lesson): ChallengeView | null {
  assertSameLesson(session, lesson);
  const step = currentStep(session);
  if (!step) return null;
  const challenge = challengeOf(lesson, step.challengeId);
  const { presentation } = session;
  const showAnswer = step.stage === 'demo' || presentation.revealed;
  return {
    key: presentationKey(session),
    stepIndex: session.cursor,
    stepCount: session.steps.length,
    stage: step.stage,
    isReprobe: step.reprobeOf !== undefined,
    challenge,
    choices: choiceOrder(session, challenge).map((choice) => ({
      choice,
      available: !presentation.eliminated.includes(choice.id),
    })),
    tryIndex: presentation.tryIndex,
    hintsUsed: presentation.hintLevel,
    hintsAvailable: step.stage === 'demo' ? 0 : challenge.hints.length - presentation.hintLevel,
    shownAnswer: showAnswer ? challenge.answer : null,
  };
}

/** Move past a demonstration. Does nothing on any other kind of step. */
export function advanceDemo(session: LessonSession, lesson: Lesson, now: number): LessonSession {
  assertSameLesson(session, lesson);
  const step = currentStep(session);
  if (step?.stage !== 'demo') return session;
  return advance(session, now);
}

/** Pick the re-probe for a challenge that needed help: prefer a different presentation of the same skill. */
function takeReprobe(
  session: LessonSession,
  lesson: Lesson,
  missed: Challenge,
): { reserve: string[]; step: Step } | null {
  if (session.reprobesUsed >= lesson.plan.independent.maxReprobes) return null;
  const candidates = session.reserve
    .map((challengeId) => challengeOf(lesson, challengeId))
    .filter((candidate) => candidate.skillId === missed.skillId);
  const pick =
    candidates.find((candidate) => candidate.variant !== missed.variant) ?? candidates[0];
  if (!pick) return null;
  return {
    reserve: session.reserve.filter((challengeId) => challengeId !== pick.id),
    step: { stage: 'independent', challengeId: pick.id, reprobeOf: missed.id },
  };
}

/**
 * Record one response. Correctness is decided here and nowhere else.
 *
 * The result is either a rejection (nothing changed, nothing to store) or the next session state together with the
 * attempt to append to the learner's record; the caller stores both in one transaction.
 */
export function submitAttempt(
  session: LessonSession,
  lesson: Lesson,
  input: SubmitInput,
): SubmitResult {
  assertSameLesson(session, lesson);
  const reject = (reason: RejectionReason): SubmitResult => ({ accepted: false, reason, session });

  const step = currentStep(session);
  if (!step) return reject('completed');
  if (step.stage === 'demo') return reject('not-answerable');
  if (input.key !== presentationKey(session)) return reject('stale');

  const challenge = challengeOf(lesson, step.challengeId);
  const { presentation } = session;
  if (!challenge.choices.some((choice) => choice.id === input.choiceId)) {
    return reject('unknown-choice');
  }
  if (presentation.eliminated.includes(input.choiceId)) return reject('unavailable-choice');

  const correct = input.choiceId === challenge.answer;
  const adultAssist = input.adultAssist === true;
  const firstTry = presentation.tryIndex === 0;
  const unassisted = presentation.hintLevel === 0 && !adultAssist;
  const independent = correct && step.stage === 'independent' && firstTry && unassisted;
  const misconception = correct ? undefined : challenge.misconceptions?.[input.choiceId];

  const attempt: Attempt = {
    schemaVersion: RECORD_SCHEMA_VERSION,
    id: `${session.id}:${session.nextSeq}`,
    profileId: session.profileId,
    sessionId: session.id,
    seq: session.nextSeq,
    lessonId: lesson.id,
    lessonVersion: lesson.version,
    contentVersion: session.contentVersion,
    challengeId: challenge.id,
    skillId: challenge.skillId,
    variant: challenge.variant,
    stage: step.stage,
    tryIndex: presentation.tryIndex,
    hintLevel: presentation.hintLevel,
    assistance: adultAssist ? 'adult' : presentation.hintLevel > 0 ? 'hint' : 'none',
    outcome: correct ? 'correct' : 'incorrect',
    response: input.choiceId,
    ...(misconception === undefined ? {} : { misconception }),
    at: input.now,
    day: input.day,
    durationMs: Math.min(MAX_DURATION_MS, Math.max(0, Math.round(input.durationMs))),
  };

  if (!correct) {
    const eliminated = [...presentation.eliminated, input.choiceId];
    const remaining = challenge.choices.filter((choice) => !eliminated.includes(choice.id));
    const revealed = presentation.revealed || remaining.length <= 1;
    return {
      accepted: true,
      attempt,
      session: {
        ...session,
        presentation: {
          ...presentation,
          tryIndex: presentation.tryIndex + 1,
          eliminated,
          revealed,
        },
        nextSeq: session.nextSeq + 1,
        updatedAt: input.now,
      },
      feedback: {
        outcome: 'incorrect',
        independent: false,
        caption: challenge.feedback.incorrect,
        misconception: misconception ?? null,
        next: 'retry',
        revealed,
      },
    };
  }

  const cleanFirstTry = firstTry && unassisted;
  let { steps, reserve, reprobesUsed } = session;
  if (step.stage === 'independent' && !cleanFirstTry) {
    const reprobe = takeReprobe(session, lesson, challenge);
    if (reprobe) {
      steps = [...steps, reprobe.step];
      reserve = reprobe.reserve;
      reprobesUsed += 1;
    }
  }
  const next = advance(
    {
      ...session,
      steps,
      reserve,
      reprobesUsed,
      nextSeq: session.nextSeq + 1,
      tally: {
        independentProbes: session.tally.independentProbes + (step.stage === 'independent' ? 1 : 0),
        independentFirstTryCorrect:
          session.tally.independentFirstTryCorrect + (independent ? 1 : 0),
        assistedSolves: session.tally.assistedSolves + (cleanFirstTry ? 0 : 1),
      },
    },
    input.now,
  );
  return {
    accepted: true,
    attempt,
    session: next,
    feedback: {
      outcome: 'correct',
      independent,
      caption: challenge.feedback.correct,
      misconception: null,
      next: next.status === 'completed' ? 'complete' : 'advance',
      revealed: false,
    },
  };
}

/**
 * Show the next rung of the current challenge's hint ladder. From then on the answer to this challenge counts as
 * assisted, however it turns out.
 */
export function getHint(session: LessonSession, lesson: Lesson, now: number): HintResult {
  assertSameLesson(session, lesson);
  const step = currentStep(session);
  if (!step || step.stage === 'demo') {
    return { session, hint: null, hintsUsed: 0, hintsAvailable: 0 };
  }
  const challenge = challengeOf(lesson, step.challengeId);
  const { presentation } = session;
  const hint = challenge.hints[presentation.hintLevel];
  if (!hint) {
    return { session, hint: null, hintsUsed: presentation.hintLevel, hintsAvailable: 0 };
  }

  const distractors = challenge.choices
    .map((choice) => choice.id)
    .filter((choiceId) => choiceId !== challenge.answer);
  let eliminated = presentation.eliminated;
  if (hint.type === 'eliminate') {
    eliminated = [
      ...new Set([...eliminated, ...hint.remove.filter((id) => distractors.includes(id))]),
    ];
  } else if (hint.type === 'reveal') {
    eliminated = distractors;
  }
  const revealed =
    presentation.revealed || hint.type === 'reveal' || eliminated.length >= distractors.length;
  const hintLevel = presentation.hintLevel + 1;

  return {
    session: {
      ...session,
      presentation: { ...presentation, hintLevel, eliminated, revealed },
      updatedAt: now,
    },
    hint,
    hintsUsed: hintLevel,
    hintsAvailable: challenge.hints.length - hintLevel,
  };
}

export function summarizeSession(session: LessonSession, lesson: Lesson): SessionSummary {
  assertSameLesson(session, lesson);
  return {
    completed: session.status === 'completed',
    ...session.tally,
    metSuccessCriteria:
      session.status === 'completed' &&
      session.tally.independentFirstTryCorrect >= lesson.successCriteria.independentFirstTryCorrect,
  };
}
