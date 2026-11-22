import numberGarden from '@/content/packs/number-garden.v1.json';
import {
  advanceDemo,
  createSession,
  getHint,
  getNextChallenge,
  parseContentPack,
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

/** What a simulated child does with one presentation. */
export type Move = { type: 'answer'; choiceId: string; adultAssist?: boolean } | { type: 'hint' };
export type Player = (view: ChallengeView) => Move;

export const answerCorrectly: Player = (view) => ({
  type: 'answer',
  choiceId: view.challenge.answer,
});

/** Picks a wrong choice first whenever one is still on the table. */
export const answerWrongFirst: Player = (view) => {
  const wrong = view.choices.find((c) => c.available && c.choice.id !== view.challenge.answer);
  return { type: 'answer', choiceId: wrong ? wrong.choice.id : view.challenge.answer };
};

export const hintThenAnswer: Player = (view) =>
  view.hintsUsed === 0 ? { type: 'hint' } : { type: 'answer', choiceId: view.challenge.answer };

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
      choiceId: move.choiceId,
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
