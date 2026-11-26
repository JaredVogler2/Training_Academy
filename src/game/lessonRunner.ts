import {
  advanceDemo,
  createSession,
  getHint,
  getNextChallenge,
  keptBy,
  submitAttempt,
  summarizeSession,
  type ChallengeView,
  type ContentPack,
  type CreateSessionInput,
  type Feedback,
  type Hint,
  type Lesson,
  type LessonSession,
  type SessionSummary,
} from '@/engine';
import { StorageError, type Repository } from '@/storage';

/**
 * Runs one sitting of one lesson for one player: the glue between the pure engine, storage and the screen.
 *
 * The engine decides everything about the lesson; this class only carries its decisions to storage and to whoever is
 * listening. A failed save never interrupts a child: the lesson carries on in memory and the state says so.
 */

export type RunnerState =
  | {
      phase: 'playing';
      view: ChallengeView;
      /** The result of the latest answer to this challenge, if there has been one. */
      feedback: Feedback | null;
      /** The latest answer: the choice picked, or the thing made as the engine writes one down. */
      picked: string | null;
      /** The hint most recently asked for on this challenge. */
      hint: Hint | null;
      /** True once the challenge has been answered correctly and the lesson is waiting for "next". */
      answered: boolean;
      saved: boolean;
    }
  | { phase: 'finished'; summary: SessionSummary; stepCount: number; saved: boolean };

export interface RunnerDeps {
  repository: Repository;
  pack: ContentPack;
  lesson: Lesson;
  profileId: string;
  now: () => number;
  newId: () => string;
  newSeed: () => number;
  localDay: (at: number) => string;
  /** Milliseconds from a steady clock, for response times. */
  elapsed: () => number;
  onSaveError?: (error: unknown) => void;
  /**
   * Whether a grown-up has said they are helping, asked as each answer is given. While one is, the answer is
   * written down as given with an adult's help, and so is never counted as something the child did alone. It is
   * the grown-up's to say, and nothing here guesses it. Left out, nobody is.
   */
  adultHelping?: () => boolean;
}

/**
 * Whether an unfinished sitting can be taken up in this lesson: it was begun in this version of it, and every
 * challenge it has still to do, or has kept back, is one the lesson has.
 *
 * It is the lesson's own version that says so, not the version of the world's content, which changes whenever
 * anything in that world does. (It was both, at first: adding activities to a world sent every child who had
 * left another of its activities half-way back to the start of it.) A lesson whose challenges or plan change
 * gets a new version, and the content build refuses a change without one (`src/content/lessons.lock.json`).
 */
export function resumable(session: LessonSession, lesson: Lesson): boolean {
  if (session.lessonId !== lesson.id || session.lessonVersion !== lesson.version) return false;
  const known = new Set(lesson.challenges.map((challenge) => challenge.id));
  return (
    session.steps.every((step) => known.has(step.challengeId)) &&
    session.reserve.every((id) => known.has(id))
  );
}

/**
 * What this player's last finished sitting of the lesson kept for next time, where the lesson keeps anything
 * (`plan.keep`): which thing, when that sitting ended, and on what day. It is read from the sittings that are
 * stored, so it is there after the page has been closed and opened again, and on another day.
 */
export async function lastKept(
  deps: Pick<RunnerDeps, 'repository' | 'lesson' | 'profileId' | 'localDay'>,
): Promise<CreateSessionInput['kept']> {
  const { repository, lesson, profileId, localDay } = deps;
  if (!lesson.plan.keep) return undefined;
  const sessions = await repository.listSessions(profileId);
  let last: { challengeId: string; at: number } | null = null;
  for (const session of sessions) {
    // A sitting left before its end kept nothing: what it would have kept was never shown. (A sitting of
    // another activity needs no telling apart: it holds none of this one's challenges, so it kept none of them.)
    if (session.completedAt === null) continue;
    const challengeId = keptBy(session, lesson);
    if (challengeId !== null && (last === null || session.completedAt > last.at)) {
      last = { challengeId, at: session.completedAt };
    }
  }
  return last === null ? undefined : { ...last, day: localDay(last.at) };
}

export class LessonRunner {
  private session: LessonSession;
  private state: RunnerState;
  private saved = true;
  private busy = false;
  private shownAt: number;
  private readonly listeners = new Set<() => void>();

  private constructor(
    private readonly deps: RunnerDeps,
    session: LessonSession,
  ) {
    this.session = session;
    this.shownAt = deps.elapsed();
    this.state = this.present();
  }

  /** Pick up the player's unfinished sitting of this lesson, or begin a new one. */
  static async start(deps: RunnerDeps): Promise<LessonRunner> {
    const { repository, lesson, pack, profileId } = deps;
    let saved = true;
    let session: LessonSession | null = null;
    try {
      const existing = await repository.findActiveSession(profileId, lesson.id);
      if (existing) {
        if (resumable(existing, lesson)) {
          // The world's content may have changed since the sitting began — more activities beside this one —
          // while this lesson has not. The sitting goes on, and what is answered from here is recorded against
          // the content as it now is.
          session =
            existing.contentVersion === pack.contentVersion
              ? existing
              : { ...existing, contentVersion: pack.contentVersion };
          if (session !== existing) await repository.saveProgress(session);
        }
        // A sitting of an older version of the lesson cannot be resumed; its answers stay in the record.
        else await repository.discardSession(existing.id);
      }
      if (!session) {
        session = LessonRunner.fresh(deps, await lastKept(deps));
        await repository.saveProgress(session);
      }
    } catch (error) {
      deps.onSaveError?.(error);
      saved = false;
      // What was kept could not be read, so nothing is asked about it: better than asking about the wrong thing.
      session ??= LessonRunner.fresh(deps, undefined);
    }
    const runner = new LessonRunner(deps, session);
    runner.saved = saved;
    runner.state = runner.present();
    return runner;
  }

  private static fresh(deps: RunnerDeps, kept: CreateSessionInput['kept']): LessonSession {
    const now = deps.now();
    return createSession(deps.lesson, {
      id: deps.newId(),
      profileId: deps.profileId,
      seed: deps.newSeed(),
      now,
      contentVersion: deps.pack.contentVersion,
      ...(kept === undefined ? {} : { kept, day: deps.localDay(now) }),
    });
  }

  getState = (): RunnerState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setState(next: RunnerState): void {
    this.state = next;
    for (const listener of this.listeners) listener();
  }

  /** The state for whatever the session says comes next. */
  private present(): RunnerState {
    const view = getNextChallenge(this.session, this.deps.lesson);
    if (!view) {
      return {
        phase: 'finished',
        summary: summarizeSession(this.session, this.deps.lesson),
        stepCount: this.session.steps.length,
        saved: this.saved,
      };
    }
    return {
      phase: 'playing',
      view,
      feedback: null,
      picked: null,
      hint: null,
      answered: false,
      saved: this.saved,
    };
  }

  private async persist(write: () => Promise<void>): Promise<void> {
    try {
      await write();
    } catch (error) {
      if (error instanceof StorageError && error.code === 'conflict') {
        // Another tab has already moved this sitting on. Its version is the one that was saved: follow it.
        const stored = await this.deps.repository
          .findActiveSession(this.deps.profileId, this.deps.lesson.id)
          .catch(() => null);
        if (stored) {
          this.session = stored;
          this.shownAt = this.deps.elapsed();
          this.setState(this.present());
          return;
        }
      }
      this.saved = false;
      this.deps.onSaveError?.(error);
      this.setState({ ...this.state, saved: false });
    }
  }

  /**
   * The child gave an answer: picked a choice, or made the thing asked for. Ignored while a previous answer is
   * still being handled, or after a correct one.
   */
  async answer(response: string): Promise<void> {
    const state = this.state;
    if (this.busy || state.phase !== 'playing' || state.answered || state.view.stage === 'demo') {
      return;
    }
    const at = this.deps.now();
    const result = submitAttempt(this.session, this.deps.lesson, {
      key: state.view.key,
      response,
      now: at,
      day: this.deps.localDay(at),
      durationMs: this.deps.elapsed() - this.shownAt,
      adultAssist: this.deps.adultHelping?.() === true,
    });
    if (!result.accepted) return;

    this.busy = true;
    this.session = result.session;
    this.shownAt = this.deps.elapsed();
    if (result.feedback.outcome === 'correct') {
      // Keep the answered challenge on screen until the child moves on.
      this.setState({ ...state, feedback: result.feedback, picked: response, answered: true });
    } else {
      const retry = getNextChallenge(this.session, this.deps.lesson);
      if (retry) {
        this.setState({ ...state, view: retry, feedback: result.feedback, picked: response });
      }
    }
    try {
      await this.persist(() => this.deps.repository.saveProgress(result.session, result.attempt));
    } finally {
      this.busy = false;
    }
  }

  /** Show the next rung of help for the current challenge. */
  async hint(): Promise<void> {
    const state = this.state;
    if (this.busy || state.phase !== 'playing' || state.answered) return;
    const result = getHint(this.session, this.deps.lesson, this.deps.now());
    if (!result.hint) return;
    this.session = result.session;
    const view = getNextChallenge(this.session, this.deps.lesson);
    if (!view) return;
    this.setState({ ...state, view, hint: result.hint, feedback: null, picked: null });
    await this.persist(() => this.deps.repository.saveProgress(result.session));
  }

  /** Move on: past a demonstration, or from an answered challenge to the next one. */
  async next(): Promise<void> {
    const state = this.state;
    if (this.busy || state.phase !== 'playing') return;
    if (state.view.stage === 'demo') {
      this.session = advanceDemo(this.session, this.deps.lesson, this.deps.now());
      const session = this.session;
      this.shownAt = this.deps.elapsed();
      this.setState(this.present());
      await this.persist(() => this.deps.repository.saveProgress(session));
      return;
    }
    if (!state.answered) return;
    this.shownAt = this.deps.elapsed();
    this.setState(this.present());
  }

  /** Start the lesson again from the beginning, as a new sitting with a new seed. */
  async restart(): Promise<void> {
    if (this.busy) return;
    let kept: CreateSessionInput['kept'];
    if (this.deps.lesson.plan.keep) {
      // The sitting just finished may have kept something: the new one is planned knowing it.
      this.busy = true;
      try {
        kept = await lastKept(this.deps).catch(() => undefined);
      } finally {
        this.busy = false;
      }
    }
    this.session = LessonRunner.fresh(this.deps, kept);
    const session = this.session;
    this.shownAt = this.deps.elapsed();
    this.setState(this.present());
    await this.persist(() => this.deps.repository.saveProgress(session));
  }
}
